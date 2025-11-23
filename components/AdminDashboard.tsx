import React, { useState, useEffect, useRef } from 'react';
import { DB } from '../services/database';
import { Resident, ActivityLog, WhatsAppGroup } from '../types';
import JSZip from 'jszip';
import { 
  Users, 
  Smartphone, 
  List, 
  Plus, 
  QrCode, 
  RefreshCw, 
  Search,
  MessageCircle,
  Clock,
  Copy,
  AlertTriangle,
  CheckCircle,
  BarChart,
  MoreHorizontal,
  Wifi,
  WifiOff,
  Image as ImageIcon,
  Filter,
  Calendar,
  X,
  ZoomIn,
  Download,
  CheckSquare,
  Square,
  Loader2,
  Trash2,
  AlertCircle,
  Camera
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'residents' | 'whatsapp' | 'logs' | 'gallery'>('residents');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResident, setNewResident] = useState<Partial<Resident>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Delete State
  const [residentToDelete, setResidentToDelete] = useState<Resident | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // WhatsApp Real State
  const [botStatus, setBotStatus] = useState<'offline' | 'disconnected' | 'connected'>('offline');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [availableGroups, setAvailableGroups] = useState<WhatsAppGroup[]>([]);
  const [isScanningGroups, setIsScanningGroups] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Gallery State
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [galleryFilterResident, setGalleryFilterResident] = useState<string>('all');
  const [galleryFilterCategory, setGalleryFilterCategory] = useState<string>('all');

  // Download/Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  // Polling interval ref
  const pollInterval = useRef<any>(null);

  useEffect(() => {
    refreshData();
    startBotPolling();
    return () => stopBotPolling();
  }, [activeTab]);

  const startBotPolling = () => {
    checkBot();
    if (pollInterval.current) clearInterval(pollInterval.current);
    pollInterval.current = setInterval(checkBot, 3000);
  };

  const stopBotPolling = () => {
    if (pollInterval.current) clearInterval(pollInterval.current);
  };

  const checkBot = async () => {
    try {
      const statusData = await DB.checkBotStatus();
      setBotStatus(statusData.status);
      if (statusData.status === 'connected') setQrCodeData(null);
      else if (statusData.status === 'disconnected' && statusData.hasQR) {
        const qr = await DB.getBotQR();
        setQrCodeData(qr);
      }
    } catch (e) {
      setBotStatus('offline');
    }
  };

  const refreshData = async () => {
    setError(null);
    try {
      const r = await DB.getResidents();
      setResidents(r);
      const l = await DB.getLogs();
      setLogs(l);
    } catch (err: any) {
      console.error("Failed to fetch admin data", err);
      setError(err.message || "Failed to load data from database.");
    }
  };

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newResident.name && newResident.roomNumber && newResident.whatsappGroupId) {
      try {
        await DB.addResident(newResident as Resident);
        setShowAddModal(false);
        setNewResident({});
        refreshData();
      } catch (err: any) {
        setError(err.message || "Failed to add resident");
      }
    }
  };

  const handleDeleteResident = async () => {
    if (!residentToDelete) return;
    setIsDeleting(true);
    try {
        await DB.deleteResident(residentToDelete.id);
        setResidentToDelete(null);
        refreshData();
    } catch (err: any) {
        setError(err.message || "Failed to delete resident");
        setResidentToDelete(null); // Close modal even on error to show the error message on dashboard
    } finally {
        setIsDeleting(false);
    }
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewResident({ ...newResident, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanGroups = async () => {
    setIsScanningGroups(true);
    setScanError(null);
    try {
      const groups = await DB.getWhatsAppGroups();
      setAvailableGroups(groups);
    } catch (err: any) {
      setScanError(err.message || "Could not scan groups. Is the bot running?");
    } finally {
      setIsScanningGroups(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- DOWNLOAD LOGIC ---

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedImageIds(new Set());
  };

  const toggleImageSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedImageIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedImageIds(newSet);
  };

  const downloadSingleImage = async (img: any) => {
    try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // Filename: ResidentName_Category_Date.jpg
        const dateStr = new Date(img.date).toISOString().split('T')[0];
        a.download = `${img.resident.replace(/\s+/g, '_')}_${img.category}_${dateStr}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Download failed", err);
        alert("Failed to download image. Try again.");
    }
  };

  const handleBulkDownload = async (allImages: any[]) => {
    if (selectedImageIds.size === 0) return;
    setIsDownloading(true);

    try {
        const zip = new JSZip();
        const folder = zip.folder("CareWatch_Memories");
        
        const imagesToDownload = allImages.filter(img => selectedImageIds.has(img.id));
        
        // Fetch all images in parallel
        await Promise.all(imagesToDownload.map(async (img) => {
            try {
                const response = await fetch(img.url);
                const blob = await response.blob();
                const dateStr = new Date(img.date).toISOString().split('T')[0];
                // Provide unique names to prevent overwrite
                const filename = `${img.resident.replace(/\s+/g, '_')}_${img.category}_${dateStr}_${img.id.split('-')[1]}.jpg`;
                folder?.file(filename, blob);
            } catch (e) {
                console.warn(`Failed to fetch image for zip: ${img.id}`);
            }
        }));

        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `CareWatch_Memories_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);

        // Cleanup
        setIsSelectionMode(false);
        setSelectedImageIds(new Set());

    } catch (err) {
        console.error("Bulk download failed", err);
        alert("Failed to create zip file.");
    } finally {
        setIsDownloading(false);
    }
  };

  // --- Sub Components ---

  const StatCard = ({ title, value, icon, color, darkColor }: any) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors">
       <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{value}</h3>
       </div>
       <div className={`p-3 rounded-2xl ${color} ${darkColor}`}>
          {icon}
       </div>
    </div>
  );

  const renderResidentsTab = () => (
    <div className="space-y-8 animate-fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
            title="Total Residents" 
            value={residents.length} 
            icon={<Users className="w-6 h-6 text-brand-600 dark:text-brand-400" />}
            color="bg-brand-50"
            darkColor="dark:bg-brand-900/30"
        />
        <StatCard 
            title="Active Families" 
            value={residents.filter(r => r.whatsappGroupId).length} 
            icon={<MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />}
            color="bg-green-50"
            darkColor="dark:bg-green-900/30"
        />
         <StatCard 
            title="Updates Today" 
            value={logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length} 
            icon={<BarChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
            color="bg-purple-50"
            darkColor="dark:bg-purple-900/30"
        />
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Resident Directory</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center space-x-2 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-200 dark:hover:shadow-none transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resident</span>
          </button>
        </div>

        {residents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                 <Users className="w-6 h-6 text-slate-400 dark:text-slate-500" />
             </div>
             <h3 className="text-slate-900 dark:text-white font-medium mb-1">No residents yet</h3>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Add your first resident to start tracking.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-slate-50 dark:divide-slate-700">
            {residents.map((r) => (
              <div key={r.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                 <div className="flex items-center space-x-4">
                    <img 
                      src={r.photoUrl || `https://ui-avatars.com/api/?name=${r.name}`} 
                      className="w-12 h-12 rounded-2xl object-cover shadow-sm bg-slate-100 dark:bg-slate-700" 
                      alt="" 
                    />
                    <div>
                       <h4 className="font-bold text-slate-800 dark:text-white">{r.name}</h4>
                       <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Room {r.roomNumber}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right hidden sm:block">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Family Group ID</span>
                       <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{r.whatsappGroupId || 'Not Connected'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setResidentToDelete(r)}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                            title="Delete Resident"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderWhatsAppTab = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-10 text-white text-center relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-500 opacity-10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col items-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-4 border-white/10 shadow-2xl ${
                    botStatus === 'connected' ? 'bg-green-500' : 
                    botStatus === 'offline' ? 'bg-red-500' : 
                    'bg-amber-400'
                }`}>
                   {botStatus === 'connected' ? <Wifi className="w-8 h-8" /> : <WifiOff className="w-8 h-8" />}
                </div>
                <h2 className="text-3xl font-bold mb-2">
                    {botStatus === 'connected' && 'AI Agent Online'}
                    {botStatus === 'disconnected' && 'Link WhatsApp'}
                    {botStatus === 'offline' && 'Server Offline'}
                </h2>
                <p className="text-slate-300 max-w-md mx-auto">
                    {botStatus === 'connected' && 'The system is actively monitoring for new logs and delivering updates to families instantly.'}
                    {botStatus === 'disconnected' && 'Scan the QR code to authorize the AI agent to send messages on your behalf.'}
                    {botStatus === 'offline' && 'The core AI engine is unreachable. Please check the terminal.'}
                </p>
            </div>
        </div>

        <div className="p-10">
             {/* QR Code Display */}
            {botStatus === 'disconnected' && (
            <div className="flex flex-col items-center">
                {qrCodeData ? (
                    <div className="p-4 bg-white rounded-3xl border-4 border-slate-100 dark:border-slate-600 shadow-inner mb-6">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeData)}`} 
                        alt="Scan QR" 
                        className="w-56 h-56 rounded-lg" 
                    />
                    </div>
                ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-3xl mb-6 animate-pulse">
                        <RefreshCw className="w-8 h-8 text-slate-300 dark:text-slate-500 animate-spin mb-2" />
                        <span className="text-sm text-slate-400 font-medium">Generating Code...</span>
                    </div>
                )}
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 space-x-2 bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-full">
                    <Smartphone className="w-4 h-4" />
                    <span>Open WhatsApp > Linked Devices > Link a Device</span>
                </div>
            </div>
            )}

            {botStatus === 'offline' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-6 rounded-2xl flex items-start space-x-4">
                <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <h4 className="font-bold text-red-900 dark:text-red-200">How to fix this</h4>
                    <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                        <li>Open your computer terminal</li>
                        <li>Navigate to the project folder</li>
                        <li>Run <code className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 font-mono text-xs">npm install</code> (only once)</li>
                        <li>Run <code className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 font-mono text-xs">node server/bot.js</code></li>
                    </ul>
                </div>
            </div>
            )}

            {botStatus === 'connected' && (
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Group Discovery</h3>
                    <button 
                        onClick={handleScanGroups}
                        disabled={isScanningGroups}
                        className="text-sm text-brand-600 dark:text-brand-400 font-bold hover:bg-brand-50 dark:hover:bg-brand-900/20 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isScanningGroups ? 'animate-spin' : ''}`} />
                        <span>Scan Groups</span>
                    </button>
                </div>

                {scanError && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-xl border border-red-100 dark:border-red-900/50">
                        {scanError}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                    {availableGroups.length > 0 ? (
                        availableGroups.map(group => (
                        <div key={group.id} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-700 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all group relative">
                            <div className="pr-8">
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{group.name}</p>
                                <p className="text-xs text-slate-400 font-mono truncate mt-1">{group.id}</p>
                            </div>
                            <button 
                                onClick={() => copyToClipboard(group.id)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                title="Copy ID"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                        ))
                    ) : (
                        <div className="col-span-2 text-center py-8 text-slate-400 dark:text-slate-500 text-sm border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl">
                             Click "Scan Groups" to see your WhatsApp groups here.
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );

  const renderLogsTab = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Activity Feed</h2>
        <div className="relative w-full md:w-64">
           <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
           <input 
                type="text" 
                placeholder="Search logs..." 
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-800 outline-none shadow-sm dark:text-white dark:placeholder-slate-500" 
           />
        </div>
      </div>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
             <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                 <List className="w-6 h-6 text-slate-300 dark:text-slate-500" />
             </div>
             <p className="text-slate-400 dark:text-slate-500">No activities logged yet.</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400`}>
                      <Users className="w-5 h-5" />
                   </div>
                   <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">{log.residentName}</h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{log.category}</span>
                   </div>
                </div>
                <div className={`flex items-center space-x-1 text-xs font-bold px-3 py-1 rounded-full border ${
                  log.status === 'SENT' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900'
                }`}>
                  {log.status === 'SENT' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  <span>{log.status}</span>
                </div>
              </div>
              
              {log.aiGeneratedMessage && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 p-4 rounded-xl mb-4 text-sm text-slate-700 dark:text-slate-300 border border-green-100 dark:border-green-900 relative">
                  <MessageCircle className="w-4 h-4 text-green-400 absolute top-4 right-4 opacity-50" />
                  <p className="font-medium text-green-800 dark:text-green-400 text-xs mb-1 uppercase tracking-wider">Sent to Family</p>
                  "{log.aiGeneratedMessage}"
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700 text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                   <Clock className="w-3 h-3" />
                   <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <span>Logged by: {log.staffName}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderGalleryTab = () => {
    // 1. Flatten all images from logs
    const galleryImages = logs.flatMap(log => 
        (log.imageUrls || []).map((url, idx) => ({
            id: `${log.id}-${idx}`,
            url,
            resident: log.residentName,
            category: log.category,
            date: log.timestamp,
            notes: log.notes,
            staff: log.staffName
        }))
    );

    // 2. Filter logic
    const filteredImages = galleryImages.filter(img => {
        const matchesResident = galleryFilterResident === 'all' || img.resident === galleryFilterResident;
        const matchesCategory = galleryFilterCategory === 'all' || img.category === galleryFilterCategory;
        return matchesResident && matchesCategory;
    });

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Gallery Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                        <ImageIcon className="w-5 h-5" />
                        <h2 className="font-bold text-slate-800 dark:text-white">Memory Wall</h2>
                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-xs font-bold">{filteredImages.length}</span>
                    </div>

                    <button 
                        onClick={toggleSelectionMode}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-2 border ${
                            isSelectionMode 
                            ? 'bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-900/50 dark:text-brand-300 dark:border-brand-700' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'
                        }`}
                    >
                        <CheckSquare className="w-3 h-3" />
                        <span>{isSelectionMode ? 'Cancel Selection' : 'Select Photos'}</span>
                    </button>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    <div className="relative">
                        <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select 
                            value={galleryFilterResident}
                            onChange={(e) => setGalleryFilterResident(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none appearance-none dark:text-white"
                        >
                            <option value="all">All Residents</option>
                            {residents.map(r => (
                                <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <select 
                        value={galleryFilterCategory}
                        onChange={(e) => setGalleryFilterCategory(e.target.value)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none appearance-none dark:text-white"
                    >
                        <option value="all">All Categories</option>
                        <option value="Breakfast">Breakfast</option>
                        <option value="Lunch">Lunch</option>
                        <option value="Dinner">Dinner</option>
                        <option value="Vital Signs">Vitals</option>
                        <option value="General Update">General</option>
                    </select>
                </div>
            </div>

            {/* Bulk Action Bar (Floating) */}
            {isSelectionMode && selectedImageIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-40 flex items-center space-x-4 animate-fade-in-up">
                    <span className="font-bold text-sm">{selectedImageIds.size} Selected</span>
                    <div className="h-4 w-px bg-slate-700"></div>
                    <button 
                        onClick={() => handleBulkDownload(filteredImages)}
                        disabled={isDownloading}
                        className="flex items-center space-x-2 text-brand-400 font-bold hover:text-white transition-colors"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span>{isDownloading ? 'Zipping...' : 'Download ZIP'}</span>
                    </button>
                </div>
            )}

            {/* Gallery Grid */}
            {filteredImages.length === 0 ? (
                 <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No photos found</h3>
                    <p className="text-slate-400 dark:text-slate-500">Try adjusting the filters or ask staff to upload some moments.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredImages.map((img) => {
                        const isSelected = selectedImageIds.has(img.id);
                        return (
                        <div 
                            key={img.id} 
                            onClick={(e) => {
                                if (isSelectionMode) toggleImageSelection(img.id, e);
                                else setSelectedImage(img);
                            }}
                            className={`group cursor-pointer relative aspect-square rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 bg-slate-200 dark:bg-black ${
                                isSelected 
                                ? 'border-brand-500 ring-2 ring-brand-500' 
                                : 'border-slate-100 dark:border-slate-700 hover:-translate-y-1'
                            }`}
                        >
                            <img 
                                src={img.url} 
                                alt={img.category} 
                                className={`w-full h-full object-contain transition-transform duration-500 ${isSelected ? 'scale-95' : 'group-hover:scale-105'}`} 
                                loading="lazy"
                            />
                            
                            {/* Selection Checkbox Overlay */}
                            {isSelectionMode && (
                                <div className="absolute inset-0 bg-black/10 flex items-start justify-end p-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                        isSelected ? 'bg-brand-500 text-white' : 'bg-black/40 text-white/50 border border-white/50'
                                    }`}>
                                        {isSelected ? <CheckCircle className="w-4 h-4" /> : <div className="w-4 h-4" />}
                                    </div>
                                </div>
                            )}

                            {/* Info Overlay (Only when NOT selecting) */}
                            {!isSelectionMode && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                    <p className="text-white font-bold text-sm truncate">{img.resident}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-white/80 text-xs">{img.category}</span>
                                        <ZoomIn className="w-4 h-4 text-white/80" />
                                    </div>
                                </div>
                            )}
                            
                            {/* Date Badge */}
                            <div className="absolute top-2 left-2 bg-white/90 dark:bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-sm pointer-events-none">
                                {new Date(img.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    )})}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedImage(null)}>
                    <div className="relative w-full max-w-5xl h-[80vh] flex flex-col md:flex-row bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        
                        {/* Close Button */}
                        <button 
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Download Button (New) */}
                        <button 
                            onClick={() => downloadSingleImage(selectedImage)}
                            className="absolute top-4 left-4 z-50 p-2 bg-black/50 text-white rounded-full hover:bg-brand-500 transition-colors flex items-center space-x-2 pr-4"
                            title="Download Image"
                        >
                            <Download className="w-5 h-5" />
                            <span className="text-xs font-bold">Save</span>
                        </button>

                        {/* Image Section */}
                        <div className="flex-1 bg-black flex items-center justify-center p-2 relative">
                            <img 
                                src={selectedImage.url} 
                                alt="Full View" 
                                className="max-w-full max-h-full object-contain rounded-lg" 
                            />
                        </div>

                        {/* Info Sidebar */}
                        <div className="w-full md:w-80 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 p-6 flex flex-col overflow-y-auto">
                            <div className="mb-6">
                                <span className="inline-block px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-bold mb-2 uppercase tracking-wider">
                                    {selectedImage.category}
                                </span>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{selectedImage.resident}</h2>
                                <div className="flex items-center text-slate-400 text-sm space-x-2">
                                    <Calendar className="w-4 h-4" />
                                    <span>{new Date(selectedImage.date).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 mb-2 uppercase tracking-wide">Staff Notes</h4>
                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 italic text-sm leading-relaxed">
                                    "{selectedImage.notes || 'No notes provided for this update.'}"
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Captured By</p>
                                    <p className="text-slate-800 dark:text-white font-medium">{selectedImage.staff}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
        <div>
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">Admin Console</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your facility and monitor AI communications.</p>
        </div>
      </div>
      
      {error && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start space-x-3 animate-fade-in">
           <div className="p-1 bg-red-100 dark:bg-red-900/40 rounded-full mt-1">
             <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
           </div>
           <div className="flex-1">
             <h3 className="text-red-800 dark:text-red-200 font-bold">System Error</h3>
             <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
           </div>
        </div>
      )}

      {/* Navigation Pills */}
      <div className="flex justify-center mb-10">
         <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 inline-flex transition-colors flex-wrap justify-center">
            {[
                { id: 'residents', icon: <Users className="w-4 h-4" />, label: 'Residents' },
                { id: 'whatsapp', icon: <Smartphone className="w-4 h-4" />, label: 'WhatsApp Bot' },
                { id: 'gallery', icon: <ImageIcon className="w-4 h-4" />, label: 'Media Gallery' },
                { id: 'logs', icon: <List className="w-4 h-4" />, label: 'History' },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center space-x-2 ${
                        activeTab === tab.id 
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-200 dark:shadow-none' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                    {tab.icon}
                    <span>{tab.label}</span>
                </button>
            ))}
         </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'residents' && renderResidentsTab()}
        {activeTab === 'whatsapp' && renderWhatsAppTab()}
        {activeTab === 'gallery' && renderGalleryTab()}
        {activeTab === 'logs' && renderLogsTab()}
      </div>

      {/* Add Resident Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-md w-full p-8 border border-white/20 dark:border-slate-800 transform transition-all scale-100">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Add New Resident</h3>
            <form onSubmit={handleAddResident} className="space-y-5">
              
              {/* Profile Picture Upload */}
              <div className="flex justify-center mb-6">
                <div className="relative group">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                        {newResident.photoUrl ? (
                            <img src={newResident.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-brand-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-brand-700 hover:scale-110 transition-all border-2 border-white dark:border-slate-900">
                        <Camera className="w-4 h-4" />
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleProfilePictureUpload}
                        />
                    </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-800 dark:text-white"
                  value={newResident.name || ''}
                  onChange={e => setNewResident({...newResident, name: e.target.value})}
                  placeholder="e.g. Martha Stewart"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Room Number</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-800 dark:text-white"
                  value={newResident.roomNumber || ''}
                  onChange={e => setNewResident({...newResident, roomNumber: e.target.value})}
                  placeholder="e.g. 104-B"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">WhatsApp Group ID</label>
                <div className="relative">
                    <input 
                    type="text" 
                    required 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all focus:bg-white dark:focus:bg-slate-800 dark:text-white pl-10"
                    value={newResident.whatsappGroupId || ''}
                    onChange={e => setNewResident({...newResident, whatsappGroupId: e.target.value})}
                    placeholder="120363... @g.us"
                    />
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 px-1">Use the "Scan Groups" tool in the WhatsApp tab to find this.</p>
              </div>
              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-200 dark:shadow-none transition-all transform active:scale-95"
                >
                  Save Resident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {residentToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-sm w-full p-8 border border-white/20 dark:border-slate-800 transform transition-all scale-100 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Remove Resident?</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    Are you sure you want to remove <span className="font-bold text-slate-800 dark:text-slate-200">{residentToDelete.name}</span>? 
                    This will also delete their activity logs and photos.
                </p>
                
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setResidentToDelete(null)}
                        className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleDeleteResident}
                        disabled={isDeleting}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-lg shadow-red-200 dark:shadow-none transition-all transform active:scale-95 flex items-center justify-center space-x-2"
                    >
                        {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{isDeleting ? 'Deleting...' : 'Yes, Remove'}</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;