import React, { useState, useEffect, useRef } from 'react';
import { Order, UserActivity } from './types';
import { Plus, Search, FileText, CheckCircle, XCircle, Phone, MapPin, CreditCard, Banknote, Trash2, Eye, Filter, Smartphone, Globe, Image as ImageIcon, User, Lock, LogOut, Cloud, X, History, UploadCloud, Download, Code, Terminal, EyeOff, Loader2, Paperclip, Save } from 'lucide-react';
import OrderModal from './components/OrderModal';
import OrderDetailsModal from './components/OrderDetailsModal';
import { useLanguage } from './i18n';
import { io } from 'socket.io-client';
import { GoogleGenAI, Type } from "@google/genai";
import { EXTRACTION_SCHEMA } from './constants';
import Markdown from 'react-markdown';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const socket = io();

// Function declarations for AI tools
const aiTools = [
  {
    functionDeclarations: [
      {
        name: "add_order",
        description: "Add a new order to the system",
        parameters: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            customerPhone: { type: Type.STRING },
            deliveryLocation: { type: Type.STRING },
            total: { type: Type.NUMBER },
            paymentMethod: { type: Type.STRING, enum: ["Cash", "Visa", "InstaPay"] },
            isPaid: { type: Type.BOOLEAN },
            notes: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["website", "social"] }
          },
          required: ["customerName", "total"]
        }
      },
      {
        name: "delete_order",
        description: "Delete an order by its ID",
        parameters: {
          type: Type.OBJECT,
          properties: {
            orderId: { type: Type.STRING }
          },
          required: ["orderId"]
        }
      },
      {
        name: "update_order_status",
        description: "Update the status of an order (paid, contacted, ready)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            orderId: { type: Type.STRING },
            isPaid: { type: Type.BOOLEAN },
            isContacted: { type: Type.BOOLEAN },
            isReady: { type: Type.BOOLEAN }
          },
          required: ["orderId"]
        }
      },
      {
        name: "update_app_config",
        description: "Update application configuration like theme colors or logo settings",
        parameters: {
          type: Type.OBJECT,
          properties: {
            logoSize: { type: Type.NUMBER, description: "Size of the logo in pixels" },
            primaryColor: { type: Type.STRING, description: "Primary theme color (hex)" },
            secondaryColor: { type: Type.STRING, description: "Secondary theme color (hex)" }
          }
        }
      },
      {
        name: "list_orders",
        description: "List all current orders to analyze them",
        parameters: { type: Type.OBJECT, properties: {} }
      }
    ]
  }
];

function Login({ onLogin }: { onLogin: (token: string, user: any) => void }) {
  const { t, language, setLanguage } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings/logo')
      .then(res => res.json())
      .then(data => setLogoUrl(data.logo))
      .catch(err => console.error('Error fetching logo:', err));

    fetch('/api/settings/background')
      .then(res => res.json())
      .then(data => setBackgroundUrl(data.background))
      .catch(err => console.error('Error fetching background:', err));

    socket.on('logo:updated', (newLogo: string) => {
      setLogoUrl(newLogo);
    });

    socket.on('background:updated', (newBg: string) => {
      setBackgroundUrl(newBg);
    });

    return () => {
      socket.off('logo:updated');
      socket.off('background:updated');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(t('loginError'));
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 relative bg-white ${loading ? 'loading-cursor' : ''}`}
      style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      {/* Language Toggle - Top Left */}
      <div className="absolute top-6 left-6 z-10">
        <button 
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-200 bg-white shadow-sm border border-slate-200 rounded-xl font-medium transition-colors whitespace-nowrap"
        >
          <Globe size={20} />
          {language === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-48 mb-4 flex items-center justify-center p-6 bg-white rounded-[2.5rem] shadow-2xl border-4 border-amarous-mustard/20 relative overflow-hidden group">
            <div className="logo-bg"></div>
            {logoUrl ? (
              <img src={logoUrl} alt="Amarous Logo" className="w-full h-auto object-contain mix-blend-multiply relative z-10 transition-transform duration-500 group-hover:scale-110" />
            ) : (
              <div className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 bg-slate-50/50 relative z-10">
                <ImageIcon size={40} className="mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider">{t('appTitle')}</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t('login')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <User className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={20} />
            <input
              type="text"
              placeholder={t('username')}
              className={`w-full ${language === 'ar' ? 'pl-4 pr-10' : 'pr-4 pl-10'} py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amarous-teal/50 transition-all`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Lock className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={20} />
            <input
              type="password"
              placeholder={t('password')}
              className={`w-full ${language === 'ar' ? 'pl-4 pr-10' : 'pr-4 pl-10'} py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amarous-teal/50 transition-all`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="relative">
            <Filter className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={20} />
            <select
              className={`w-full ${language === 'ar' ? 'pl-4 pr-10' : 'pr-4 pl-10'} py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amarous-teal/50 transition-all appearance-none`}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="admin">{t('admin')}</option>
              <option value="manager">{t('manager')}</option>
              <option value="stock_keeper">{t('stock_keeper')}</option>
            </select>
          </div>

          {error && <p className="text-rose-500 text-sm text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amarous-mustard hover:bg-amarous-mustard-dark text-white py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-amarous-mustard/30 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? '...' : t('login')}
          </button>
        </form>
      </div>
    </div>
  );
}

const EGYPT_GOVERNORATES = [
  { ar: "القاهرة", en: "Cairo", aliases: ["cairo", "القاهره", "قاهرة", "قاهره", "القاهرة"] },
  { ar: "الجيزة", en: "Giza", aliases: ["giza", "الجيزه", "جيزة", "جيزه", "الجيزة"] },
  { ar: "الإسكندرية", en: "Alexandria", aliases: ["alex", "alexandria", "اسكندرية", "الإسكندرية", "اسكندريه"] },
  { ar: "القليوبية", en: "Qalyubia", aliases: ["qalyubia", "القليوبيه", "قليوبية", "القليوبية"] },
  { ar: "الدقهلية", en: "Dakahlia", aliases: ["dakahlia", "الدقهليه", "دقهلية", "الدقهلية"] },
  { ar: "الشرقية", en: "Sharqia", aliases: ["sharqia", "الشرقيه", "شرقية", "الشرقية"] },
  { ar: "الغربية", en: "Gharbia", aliases: ["gharbia", "الغربيه", "غربية", "الغربية"] },
  { ar: "المنوفية", en: "Monufia", aliases: ["monufia", "المنوفيه", "منوفية", "المنوفية"] },
  { ar: "البحيرة", en: "Beheira", aliases: ["beheira", "البحيره", "بحيرة", "البحيرة"] },
  { ar: "كفر الشيخ", en: "Kafr El Sheikh", aliases: ["kafr", "كفر"] },
  { ar: "دمياط", en: "Damietta", aliases: ["damietta", "دمياط"] },
  { ar: "بورسعيد", en: "Port Said", aliases: ["port said", "بورسعيد"] },
  { ar: "الإسماعيلية", en: "Ismailia", aliases: ["ismailia", "الاسماعيلية", "اسماعيلية", "الاسماعيليه", "الإسماعيلية"] },
  { ar: "السويس", en: "Suez", aliases: ["suez", "السويس", "سويس"] },
  { ar: "شمال سيناء", en: "North Sinai", aliases: ["north sinai", "شمال سيناء"] },
  { ar: "جنوب سيناء", en: "South Sinai", aliases: ["south sinai", "جنوب سيناء"] },
  { ar: "بني سويف", en: "Beni Suef", aliases: ["beni suef", "بني سويف", "بنى سويف"] },
  { ar: "المنيا", en: "Minya", aliases: ["minya", "المنيا", "منيا"] },
  { ar: "الفيوم", en: "Faiyum", aliases: ["faiyum", "fayoum", "الفيوم", "فيوم"] },
  { ar: "أسيوط", en: "Asyut", aliases: ["asyut", "assiut", "اسيوط", "أسيوط"] },
  { ar: "سوهاج", en: "Sohag", aliases: ["sohag", "سوهاج"] },
  { ar: "قنا", en: "Qena", aliases: ["qena", "قنا"] },
  { ar: "الأقصر", en: "Luxor", aliases: ["luxor", "الاقصر", "أقصر", "اقصر", "الأقصر"] },
  { ar: "أسوان", en: "Aswan", aliases: ["aswan", "اسوان", "أسوان"] },
  { ar: "البحر الأحمر", en: "Red Sea", aliases: ["red sea", "البحر الاحمر", "البحر الأحمر"] },
  { ar: "الوادي الجديد", en: "New Valley", aliases: ["new valley", "الوادي الجديد", "الوادى الجديد"] },
  { ar: "مطروح", en: "Matrouh", aliases: ["matrouh", "مطروح"] }
];

export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const [token, setToken] = useState<string | null>(localStorage.getItem('amarous_token'));
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('amarous_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'website' | 'social'>('website');
  const [typeFilter, setTypeFilter] = useState<'all' | 'website' | 'social'>('all');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'ready' | 'not_ready'>('all');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isProgrammingModalOpen, setIsProgrammingModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiHistory, setAiHistory] = useState<{prompt: string, response: string}[]>([]);
  const [aiHistoryIndex, setAiHistoryIndex] = useState(-1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [progress, setProgress] = useState<{ active: boolean; percent: number; message: string }>({ active: false, percent: 0, message: '' });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [isBatchPreviewOpen, setIsBatchPreviewOpen] = useState(false);
  const [aiFiles, setAiFiles] = useState<{name: string, dataUrl: string, mimeType: string}[]>([]);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('amarous_token', newToken);
    localStorage.setItem('amarous_user', JSON.stringify(newUser));
  };

  const fetchUsers = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await apiFetch('/api/users');
      if (res && res.ok) {
        const data = await res.json();
        setUsers(data);
        setIsUsersModalOpen(true);
      } else if (res) {
        const errorText = await res.text();
        console.error('Error fetching users:', res.status, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          alert(errorJson.message || t('errorFetchingUsers') || 'Error fetching users');
        } catch (e) {
          alert(t('errorFetchingUsers') || 'Error fetching users');
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(t('errorFetchingUsers') || 'Error fetching users');
    }
  };

  const handleAddUser = async (userData: any) => {
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      if (res && res.ok) {
        const newUser = await res.json();
        setUsers(prev => [...prev, newUser]);
      }
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const res = await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res && res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleAiProgramming = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsAiLoading(true);
    setProgress({ active: true, percent: 10, message: t('processing') || 'Processing...' });
    const currentPrompt = aiPrompt;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const contents: any[] = [{ role: 'user', parts: [{ text: currentPrompt }] }];
      
      if (aiFiles.length > 0) {
        for (const file of aiFiles) {
          contents[0].parts.push({
            inlineData: {
              mimeType: file.mimeType,
              data: file.dataUrl.split(',')[1]
            }
          });
        }
      }

      setProgress(prev => ({ ...prev, percent: 30 }));
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: contents,
        config: {
          systemInstruction: "You are a world-class senior web engineer and lead product designer. You are acting as a code assistant for the Amarous Invoice application. You have access to tools to manage orders directly. When the user asks to perform an action (like adding, deleting, or updating orders), use the provided tools. If you perform an action, explain what you did. You can also analyze the current orders by listing them. You can also see images or documents provided by the user.",
          tools: aiTools
        }
      });
      
      setProgress(prev => ({ ...prev, percent: 60 }));
      const functionCalls = response.functionCalls;
      if (functionCalls) {
        let executionResults = [];
        for (const call of functionCalls) {
          if (call.name === 'add_order') {
            const args = call.args as any;
            const type = args.type || 'website';
            const newOrder: Order = {
              id: crypto.randomUUID(),
              orderNumber: getNextOrderNumber(type),
              customerName: args.customerName,
              customerPhone: args.customerPhone || '',
              deliveryLocation: args.deliveryLocation || '',
              isPaid: args.isPaid || false,
              paymentMethod: args.paymentMethod || 'Cash',
              isContacted: false,
              notes: args.notes || 'Added via AI Assistant',
              pdfFiles: [],
              total: args.total,
              shippingCost: 0,
              paidAmount: args.isPaid ? args.total : 0,
              productDetails: [],
              createdAt: new Date().toISOString(),
              type: type,
              isReady: false
            };
            await handleAddOrder(newOrder);
            executionResults.push(`Successfully added order for ${args.customerName}`);
          } else if (call.name === 'delete_order') {
            const args = call.args as any;
            await handleDeleteOrder(args.orderId);
            executionResults.push(`Successfully deleted order ${args.orderId}`);
          } else if (call.name === 'update_order_status') {
            const args = call.args as any;
            const orderToUpdate = orders.find(o => o.id === args.orderId);
            if (orderToUpdate) {
              const updated = { ...orderToUpdate };
              if (args.isPaid !== undefined) updated.isPaid = args.isPaid;
              if (args.isContacted !== undefined) updated.isContacted = args.isContacted;
              if (args.isReady !== undefined) updated.isReady = args.isReady;
              await handleEditOrder(updated);
              executionResults.push(`Updated status for order ${args.orderId}`);
            }
          } else if (call.name === 'update_app_config') {
            const args = call.args as any;
            if (args.primaryColor) {
              document.documentElement.style.setProperty('--color-amarous-teal', args.primaryColor);
              executionResults.push(`Updated primary color to ${args.primaryColor}`);
            }
            if (args.secondaryColor) {
              document.documentElement.style.setProperty('--color-amarous-yellow', args.secondaryColor);
              executionResults.push(`Updated secondary color to ${args.secondaryColor}`);
            }
            if (args.logoSize) {
              const logoContainer = document.querySelector('.logo-container .w-80') as HTMLElement;
              if (logoContainer) {
                logoContainer.style.width = `${args.logoSize}px`;
                executionResults.push(`Updated logo size to ${args.logoSize}px`);
              }
            }
          } else if (call.name === 'list_orders') {
            executionResults.push(`Current orders: ${JSON.stringify(orders.map(o => ({ id: o.id, num: o.orderNumber, name: o.customerName, total: o.total, paid: o.isPaid })))}`);
          }
        }
        
        setProgress(prev => ({ ...prev, percent: 80 }));
        // Follow up with the model to explain the results
        const followUp = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [
            { role: 'user', parts: [{ text: currentPrompt }] },
            { role: 'model', parts: [{ text: 'I will perform these actions.' }] },
            { role: 'user', parts: [{ text: `Execution results: ${executionResults.join('. ')}` }] }
          ],
          config: { systemInstruction: "Explain to the user what you have done based on the execution results." }
        });
        
        const responseText = followUp.text || 'Actions performed successfully.';
        setAiResponse(responseText);
        const newHistory = [...aiHistory.slice(0, aiHistoryIndex + 1), { prompt: currentPrompt, response: responseText }];
        setAiHistory(newHistory);
        setAiHistoryIndex(newHistory.length - 1);
      } else {
        const responseText = response.text || 'No response from AI.';
        setAiResponse(responseText);
        const newHistory = [...aiHistory.slice(0, aiHistoryIndex + 1), { prompt: currentPrompt, response: responseText }];
        setAiHistory(newHistory);
        setAiHistoryIndex(newHistory.length - 1);
      }
      setProgress({ active: true, percent: 100, message: t('done') || 'Done!' });
      setTimeout(() => setProgress(prev => ({ ...prev, active: false })), 1000);
      setAiPrompt('');
      setAiFiles([]);
    } catch (error) {
      console.error('AI Programming Error:', error);
      setAiResponse('Error: Failed to process AI request. Please check your connection and try again.');
      setProgress(prev => ({ ...prev, active: false }));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiUndo = () => {
    if (aiHistoryIndex <= 0) {
      if (aiHistoryIndex === 0) {
        setAiHistoryIndex(-1);
        setAiResponse('');
      }
      return;
    }
    const newIndex = aiHistoryIndex - 1;
    setAiHistoryIndex(newIndex);
    setAiResponse(aiHistory[newIndex].response);
  };

  const handleAiRedo = () => {
    if (aiHistoryIndex >= aiHistory.length - 1) return;
    const newIndex = aiHistoryIndex + 1;
    setAiHistoryIndex(newIndex);
    setAiResponse(aiHistory[newIndex].response);
  };

  const retry = async <T,>(fn: () => Promise<T>, maxRetries = 7, delay = 5000): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const errorStr = JSON.stringify(error).toLowerCase();
        const errorMsg = (error?.message || '').toLowerCase();
        
        if (
          errorMsg.includes('429') || 
          errorMsg.includes('resource_exhausted') || 
          errorMsg.includes('quota') ||
          errorStr.includes('429') ||
          errorStr.includes('resource_exhausted') ||
          errorStr.includes('quota')
        ) {
          const waitTime = delay + Math.random() * 2000; // Add jitter
          console.log(`Rate limit hit, retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          delay *= 2; // Exponential backoff
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  const pdfToImage = async (dataUrl: string): Promise<string> => {
    try {
      console.log('Starting PDF to Image conversion...');
      const loadingTask = pdfjsLib.getDocument(dataUrl);
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded. Pages: ${pdf.numPages}`);
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      if (context) {
        console.log('Rendering PDF page to canvas...');
        // @ts-ignore - handle different pdfjs-dist versions
        await page.render({ canvasContext: context, viewport, canvas: canvas }).promise;
        console.log('PDF page rendered successfully.');
        return canvas.toDataURL('image/png');
      }
    } catch (error: any) {
      console.error('Error converting PDF to image:', error);
      if (error?.message?.includes('worker')) {
        console.error('PDF Worker Error detected. Check workerSrc configuration.');
      }
    }
    return '';
  };

  const processBatchFile = async (file: File): Promise<Order | null> => {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = base64.split(',')[1];

      const response = await retry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          },
          `Extract order details from this document. Return ONLY a JSON object. 
          Include product names, quantities, and prices.
          Also classify the order source as "website" or "social" based on the document content. 
          If it looks like a website invoice (formal layout, tax ID, etc.), use "website". 
          If it looks like a social media chat screenshot or informal receipt, use "social".`
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: EXTRACTION_SCHEMA
        }
      }));

      const text = response.text;
      if (text) {
        try {
          // Clean the text in case it's wrapped in markdown or has extra characters
          let jsonStr = text.trim();
          if (jsonStr.includes('```')) {
            jsonStr = jsonStr.replace(/```json\n?|```/g, '').trim();
          }
          
          // Attempt to find the first '{' and last '}' to handle potential garbage output
          const firstBrace = jsonStr.indexOf('{');
          const lastBrace = jsonStr.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
          }

          const extractedData = JSON.parse(jsonStr);
          
          // Check for duplicate order number or content immediately
          const trimmedExtracted = (extractedData.orderNumber || '').toString().trim();
          const isTemp = !trimmedExtracted || trimmedExtracted.startsWith('TEMP-');
          
          // 1. Check by order number
          if (!isTemp) {
            const existsInDb = orders.some(o => (o.orderNumber || '').trim() === trimmedExtracted);
            const existsInPending = pendingOrders.some(o => (o.orderNumber || '').trim() === trimmedExtracted);
            if (existsInDb || existsInPending) {
              console.warn(`Skipping duplicate order number: ${trimmedExtracted}`);
              return null; 
            }
          }

          // 2. Check by file content (dataUrl) - "Media Library" check
          const fileExistsInDb = orders.some(o => 
            (o.pdfFiles || []).some(f => f.dataUrl === base64)
          );
          const fileExistsInPending = pendingOrders.some(o => 
            (o.pdfFiles || []).some(f => f.dataUrl === base64)
          );
          if (fileExistsInDb || fileExistsInPending) {
            console.warn(`Skipping duplicate file content for: ${file.name}`);
            return null;
          }

          // 3. Check by data similarity (Customer + Total) if number is missing
          if (isTemp) {
            const similarOrder = orders.find(o => 
              o.customerName === extractedData.customerName && 
              Math.abs(o.total - (extractedData.total || 0)) < 0.01
            );
            if (similarOrder) {
              console.warn(`Skipping similar order data: ${extractedData.customerName} - ${extractedData.total}`);
              return null;
            }
          }

          let type = extractedData.type || (file.type === 'application/pdf' ? 'website' : 'social');

          // Generate a thumbnail
          let thumbnail = '';
          if (file.type.startsWith('image/')) {
            thumbnail = base64;
          } else if (file.type === 'application/pdf') {
            thumbnail = await pdfToImage(base64);
          }

          const newOrder: Order = {
            id: crypto.randomUUID(),
            orderNumber: extractedData.orderNumber || `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            customerName: extractedData.customerName || 'Unknown',
            customerPhone: extractedData.customerPhone || '',
            deliveryLocation: extractedData.deliveryLocation || '',
            isPaid: extractedData.isPaid || false,
            paymentMethod: (extractedData.paymentMethod?.toLowerCase().includes('insta') ? 'InstaPay' : 
                           extractedData.paymentMethod?.toLowerCase().includes('visa') || extractedData.paymentMethod?.toLowerCase().includes('card') ? 'Visa' : 'Cash') as any,
            isContacted: false,
            notes: '',
            pdfFiles: [{ name: file.name, dataUrl: base64, mimeType: file.type }],
            thumbnail: thumbnail,
            total: extractedData.total || 0,
            shippingCost: extractedData.shippingCost || 0,
            discount: extractedData.discount || 0,
            discountType: 'amount',
            paidAmount: extractedData.paidAmount || 0,
            productDetails: (extractedData.productDetails || []).map((item: any) => ({
              ...item,
              unitPrice: item.unitPrice || (item.price / (item.quantity || 1)) || item.price,
              quantity: item.quantity || 1
            })),
            createdAt: new Date().toISOString(),
            type: type,
            isReady: false
          };

          return newOrder;
        } catch (parseError) {
          console.error(`JSON Parse Error for ${file.name}:`, parseError);
          console.log('Raw text:', text);
          throw new Error(`فشل في تحليل بيانات الملف: ${file.name}. قد يكون الملف كبيراً جداً أو غير متوافق.`);
        }
      }
    } catch (error) {
      console.error(`Error processing batch file ${file.name}:`, error);
    }
    return null;
  };

  const handleBatchSave = async () => {
    setIsAiLoading(true);
    setProgress({ active: true, percent: 0, message: t('saving') || 'Saving...' });
    try {
      // Sort all pending orders by type then by creation time to maintain sequence
      const ordersToSave = [...pendingOrders].sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.createdAt.localeCompare(b.createdAt);
      });
      
      // Calculate a single unified next number
      const allNumbers = orders.map(o => {
        const numStr = (o.orderNumber || '').replace(/#S-|#W-|#INV-/, '');
        const num = parseInt(numStr);
        return isNaN(num) ? 0 : num;
      });
      let nextNum = Math.max(0, ...allNumbers);

      const prefixSocial = '#S-';
      const prefixWebsite = '#W-';

      // Filter out duplicates and keep track of them
      const validOrdersToSave: Order[] = [];
      const duplicateNumbers: string[] = [];

      for (const order of ordersToSave) {
        let isDuplicate = false;
        
        // 1. Check by order number
        const trimmedNum = (order.orderNumber || '').trim();
        if (trimmedNum && !trimmedNum.startsWith('TEMP-')) {
          const existsInDb = orders.some(o => (o.orderNumber || '').trim() === trimmedNum);
          if (existsInDb) isDuplicate = true;
        }
        
        // 2. Check by file content (dataUrl)
        if (!isDuplicate && order.pdfFiles && order.pdfFiles.length > 0) {
          const firstFileData = order.pdfFiles[0].dataUrl;
          const fileExistsInDb = orders.some(o => 
            (o.pdfFiles || []).some(f => f.dataUrl === firstFileData)
          );
          if (fileExistsInDb) isDuplicate = true;
        }

        // 3. Check for duplicates within the batch itself
        if (!isDuplicate && trimmedNum && !trimmedNum.startsWith('TEMP-')) {
          const alreadyProcessed = validOrdersToSave.some(o => (o.orderNumber || '').trim() === trimmedNum);
          if (alreadyProcessed) isDuplicate = true;
        }

        if (isDuplicate) {
          duplicateNumbers.push(trimmedNum || order.customerName || 'Unknown');
        } else {
          validOrdersToSave.push(order);
        }
      }

      if (validOrdersToSave.length === 0 && ordersToSave.length > 0) {
        alert('جميع الفواتير في هذه الدفعة مكررة بالفعل في النظام (سواء برقم الفاتورة أو بمحتوى الملف). تم تخطيها بالكامل.');
        setIsAiLoading(false);
        setProgress(prev => ({ ...prev, active: false }));
        return;
      }

      const totalToSave = validOrdersToSave.length;
      let savedCount = 0;

      for (const order of validOrdersToSave) {
        // Always assign a new number from the unified sequence if missing or temporary
        if (!order.orderNumber || order.orderNumber.startsWith('TEMP-')) {
          nextNum++;
          const prefix = order.type === 'social' ? prefixSocial : prefixWebsite;
          order.orderNumber = `${prefix}${nextNum}`;
        }
        await handleAddOrder(order);
        savedCount++;
        setProgress(prev => ({ ...prev, percent: Math.round((savedCount / totalToSave) * 100) }));
      }

      setPendingOrders([]);
      setIsBatchPreviewOpen(false);
      
      if (duplicateNumbers.length > 0) {
        alert(`يوجد خطأ: تم اكتشاف ${duplicateNumbers.length} فاتورة مكررة وتم تخطيها، وحفظ باقي الفواتير بنجاح.`);
      } else {
        alert(t('batchSaveSuccess') || 'All orders saved successfully!');
      }
      setProgress({ active: true, percent: 100, message: t('done') || 'Done!' });
      setTimeout(() => setProgress(prev => ({ ...prev, active: false })), 1000);
    } catch (error) {
      console.error('Error saving batch:', error);
      alert('Failed to save some orders.');
      setProgress(prev => ({ ...prev, active: false }));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, userData: any) => {
    try {
      const res = await apiFetch(`/api/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
      if (res && res.ok) {
        const updatedUser = await res.json();
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const fetchMedia = async () => {
    try {
      const res = await apiFetch('/api/media');
      if (res) {
        const data = await res.json();
        setMedia(data);
        setIsMediaModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    }
  };

  const handleAddMedia = async (mediaData: any) => {
    try {
      const res = await apiFetch('/api/media', {
        method: 'POST',
        body: JSON.stringify(mediaData)
      });
      if (res && res.ok) {
        const newMedia = await res.json();
        setMedia(prev => [newMedia, ...prev]);
      }
    } catch (error) {
      console.error('Error adding media:', error);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const res = await apiFetch(`/api/media/${mediaId}`, { method: 'DELETE' });
      if (res && res.ok) {
        setMedia(prev => prev.filter(m => m.id !== mediaId));
      }
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  };

  const fetchActivities = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await apiFetch('/api/activity');
      if (res) {
        const data = await res.json();
        setActivities(data);
        setIsActivityModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('amarous_token');
    localStorage.removeItem('amarous_user');
  };

  const apiFetch = async (url: string, options: any = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    try {
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        handleLogout();
        return null;
      }
      return res;
    } catch (error) {
      console.error(`Fetch error for ${url}:`, error);
      throw error;
    }
  };

  const togglePaymentStatus = async (id: string) => {
    if (user?.role !== 'admin') return;
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    try {
      await apiFetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isPaid: !order.isPaid })
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const toggleContactStatus = async (id: string) => {
    if (user?.role !== 'admin') return;
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    try {
      await apiFetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isContacted: !order.isContacted })
      });
    } catch (error) {
      console.error('Error updating contact status:', error);
    }
  };

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const ordersRes = await apiFetch('/api/orders');
        const logoRes = await fetch('/api/settings/logo');
        const bgRes = await fetch('/api/settings/background');
        
        if (ordersRes) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData);
        }

        const logoData = await logoRes.json();
        setLogoUrl(logoData.logo);

        const bgData = await bgRes.json();
        setBackgroundUrl(bgData.background);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    socket.on('order:created', (newOrder: Order) => {
      setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
    });

    socket.on('order:updated', (updatedOrder: Order) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    socket.on('order:deleted', (id: string) => {
      setOrders(prev => prev.filter(o => o.id !== id));
    });

    socket.on('logo:updated', (newLogo: string) => {
      setLogoUrl(newLogo);
    });

    socket.on('background:updated', (newBg: string) => {
      setBackgroundUrl(newBg);
    });

    return () => {
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('order:deleted');
      socket.off('logo:updated');
      socket.off('background:updated');
    };
  }, [token]);

  const handleAddOrder = async (order: Order) => {
    // Final check for duplicate order number before saving
    const trimmedNumber = (order.orderNumber || '').trim();
    if (trimmedNumber && !trimmedNumber.startsWith('TEMP-')) {
      const isDuplicate = orders.some(o => o.orderNumber === trimmedNumber && o.id !== order.id);
      if (isDuplicate) {
        alert(`يوجد خطأ: رقم الفاتورة ${trimmedNumber} موجود بالفعل في النظام. لا يمكن تكرار رقم الفاتورة.`);
        return;
      }
    }

    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(order)
      });
      
      if (res && res.ok) {
        const savedOrder = await res.json();
        // Manually update state in case socket is slow/fails
        setOrders(prev => [savedOrder, ...prev.filter(o => o.id !== savedOrder.id)]);
        
        // Clear all filters to make sure the new order is visible
        setSearchTerm('');
        setLocationFilter('');
        setPaymentFilter('all');
        setTypeFilter('all');
        
        setIsModalOpen(false);
      } else if (res) {
        const err = await res.json();
        alert(err.message || 'Failed to save invoice');
      }
    } catch (error) {
      console.error('Error adding order:', error);
      alert('Failed to connect to server');
    }
  };

  const handleEditOrder = async (updatedOrder: Order) => {
    try {
      const res = await apiFetch(`/api/orders/${updatedOrder.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedOrder)
      });
      
      if (res && res.ok) {
        const savedOrder = await res.json();
        // Manually update state
        setOrders(prev => prev.map(o => o.id === savedOrder.id ? savedOrder : o));
        setIsModalOpen(false);
      } else if (res) {
        const err = await res.json();
        alert(err.message || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error editing order:', error);
      alert('Failed to connect to server');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await apiFetch(`/api/orders/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const updateOrderField = async (id: string, field: string, value: any) => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;
      let updatedOrder = { ...order, [field]: value };
      
      // Automatic isPaid logic
      if (field === 'paidAmount' || field === 'total') {
        const total = field === 'total' ? Number(value) : Number(order.total);
        const paidAmount = field === 'paidAmount' ? Number(value) : Number(order.paidAmount);
        updatedOrder.isPaid = paidAmount >= total;
      }
      
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));

      await apiFetch(`/api/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedOrder)
      });
    } catch (error) {
      console.error('Error updating order field:', error);
    }
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  const openEditModal = (order: Order) => {
    setSelectedOrder(order);
    setModalType(order.type || 'website');
    setIsModalOpen(true);
  };

  const getNextOrderNumber = (type: 'website' | 'social') => {
    const prefix = type === 'social' ? '#S-' : '#W-';
    const typeOrders = orders.filter(o => o.type === type);
    
    if (typeOrders.length === 0) return `${prefix}1`;
    
    const numbers = typeOrders
      .map(o => {
        const numPart = (o.orderNumber || '').replace(prefix, '');
        return parseInt(numPart);
      })
      .filter(n => !isNaN(n));
      
    if (numbers.length === 0) return `${prefix}1`;
    
    return `${prefix}${Math.max(...numbers) + 1}`;
  };

  const openAddModal = (type: 'website' | 'social') => {
    const nextNum = getNextOrderNumber(type);
    setSelectedOrder({
      id: '',
      orderNumber: nextNum,
      customerName: '',
      customerPhone: '',
      deliveryLocation: '',
      isPaid: false,
      paymentMethod: 'Cash',
      isContacted: false,
      notes: '',
      pdfFiles: [],
      total: 0,
      shippingCost: 0,
      paidAmount: 0,
      productDetails: [],
      createdAt: new Date().toISOString(),
      type: type
    });
    setModalType(type);
    setIsModalOpen(true);
  };

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const filteredOrders = orders.filter(o => {
    const search = searchTerm.toLowerCase();
    const orderNum = (o.orderNumber || '').toLowerCase();
    const custName = (o.customerName || '').toLowerCase();
    const custPhone = (o.customerPhone || '').toLowerCase();

    const matchesSearch = orderNum.includes(search) || 
                          custName.includes(search) ||
                          custPhone.includes(search);
    
    let matchesLocation = true;
    if (locationFilter) {
      const selectedGov = EGYPT_GOVERNORATES.find(g => g.en === locationFilter);
      if (selectedGov) {
        const loc = (o.deliveryLocation || '').toLowerCase();
        matchesLocation = selectedGov.aliases.some(alias => loc.includes(alias));
      }
    }

    let matchesPayment = true;
    if (paymentFilter === 'paid') matchesPayment = !!o.isPaid;
    if (paymentFilter === 'unpaid') matchesPayment = !o.isPaid;

    let matchesType = true;
    if (typeFilter !== 'all') {
      matchesType = (o.type === typeFilter) || (!o.type && typeFilter === 'website');
    }

    let matchesReadiness = true;
    if (readinessFilter !== 'all') {
      matchesReadiness = readinessFilter === 'ready' ? o.isReady : !o.isReady;
    }

    return matchesSearch && matchesLocation && matchesPayment && matchesType && matchesReadiness;
  }).sort((a, b) => {
    const aValue = a[sortConfig.key as keyof Order];
    const bValue = b[sortConfig.key as keyof Order];

    if (aValue === bValue) return 0;
    
    // Special handling for dates
    if (sortConfig.key === 'createdAt') {
      const aTime = new Date(aValue as string).getTime();
      const bTime = new Date(bValue as string).getTime();
      return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
    }

    if (sortConfig.direction === 'asc') {
      return (aValue || '') > (bValue || '') ? 1 : -1;
    } else {
      return (aValue || '') < (bValue || '') ? 1 : -1;
    }
  });

  return (
    <div 
      className={`min-h-screen flex flex-col relative bg-white ${isAiLoading ? 'loading-cursor' : ''}`} 
      style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : {}}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Main Content */}
      <main className="flex-1 p-4 overflow-auto w-full max-w-[98vw] mx-auto relative z-10">
        {/* Top Navigation Bar */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-100 flex flex-wrap gap-2 items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl font-medium text-slate-600">
              <User size={18} className="text-amarous-teal" />
              <span className="text-sm font-bold">{user?.username}</span>
            </div>
            <button 
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 bg-white shadow-sm border border-slate-200 rounded-xl font-medium transition-colors whitespace-nowrap"
            >
              <Globe size={20} className="text-amarous-teal" />
              {language === 'ar' ? 'English' : 'العربية'}
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => setIsProgrammingModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 text-amarous-teal hover:bg-amarous-teal/10 bg-white shadow-sm border border-slate-200 rounded-xl font-bold transition-colors whitespace-nowrap"
              >
                <Terminal size={20} />
                {t('programming')}
              </button>
            )}
            {user?.role === 'admin' && (
              <>
                <button 
                  onClick={fetchActivities}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 bg-white shadow-sm border border-slate-200 rounded-xl font-medium transition-colors whitespace-nowrap"
                >
                  <History size={20} className="text-amarous-teal" />
                  {t('userActivity')}
                </button>
                <button 
                  onClick={fetchUsers}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 bg-white shadow-sm border border-slate-200 rounded-xl font-medium transition-colors whitespace-nowrap"
                >
                  <User size={20} className="text-amarous-teal" />
                  {t('users')}
                </button>
              </>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 bg-white shadow-sm border border-slate-200 rounded-xl font-medium transition-colors whitespace-nowrap"
            >
              <LogOut size={20} />
              {t('logout')}
            </button>
          </div>
        </div>

        <header className="flex flex-col items-center mb-12 relative logo-container">
          <div className="w-80 mb-2 flex flex-col items-center justify-center relative p-12 bg-white rounded-[5rem] shadow-2xl border-4 border-amarous-mustard/10 overflow-hidden group">
            <div className="logo-bg"></div>
            <img src={logoUrl || 'https://i.ibb.co/6c2Y6y2/logo.jpg'} alt="Amarous Logo" className="w-full h-auto object-contain mix-blend-multiply relative z-10 transition-transform duration-700 group-hover:scale-125" />
          </div>
        </header>

        {/* Top Actions */}
        {user?.role === 'admin' && (
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 w-full max-w-5xl mx-auto mb-10 flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => openAddModal('website')}
              className="bg-amarous-teal hover:bg-amarous-teal-dark text-white px-8 py-4 rounded-[2rem] font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-amarous-teal/20 hover:scale-[1.02] active:scale-[0.98] min-w-[200px]"
            >
              <Plus size={24} />
              {t('addInvoice')}
            </button>
            <button 
              onClick={() => openAddModal('social')}
              className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-4 rounded-[2rem] font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-slate-800/20 hover:scale-[1.02] active:scale-[0.98] min-w-[200px]"
            >
              <Plus size={24} />
              {t('addSocialInvoice')}
            </button>
            <label className="bg-amarous-yellow hover:bg-amarous-yellow-dark text-white px-8 py-4 rounded-[2rem] font-bold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-amarous-yellow/20 hover:scale-[1.02] active:scale-[0.98] min-w-[200px] cursor-pointer">
              <UploadCloud size={24} />
              <span>{t('batchUpload') || 'Batch Upload'}</span>
              <input 
                type="file" 
                multiple 
                accept=".pdf,image/*" 
                className="hidden" 
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  
                  setIsAiLoading(true);
                  setProgress({ active: true, percent: 0, message: t('extracting') || 'Extracting...' });
                  const extracted: Order[] = [];
                  const totalFiles = files.length;
                  for (let i = 0; i < totalFiles; i++) {
                    const order = await processBatchFile(files[i]);
                    if (order) extracted.push(order);
                    setProgress(prev => ({ ...prev, percent: Math.round(((i + 1) / totalFiles) * 100) }));
                  }
                  setPendingOrders(extracted);
                  setIsBatchPreviewOpen(true);
                  setIsAiLoading(false);
                  setProgress({ active: true, percent: 100, message: t('done') || 'Done!' });
                  setTimeout(() => setProgress(prev => ({ ...prev, active: false })), 1000);
                }}
              />
            </label>
          </div>
        )}

        {/* Filters & Search */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 mb-4 flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={20} />
            <input 
              type="text" 
              placeholder={t('searchPlaceholder')} 
              className={`w-full ${language === 'ar' ? 'pl-4 pr-10' : 'pr-4 pl-10'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amarous-teal/50 transition-all`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-48">
            <Filter className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={20} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className={`w-full ${language === 'ar' ? 'pl-4 pr-10' : 'pr-4 pl-10'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amarous-teal/50 transition-all appearance-none font-medium`}
            >
              <option value="all">{t('allTypes')}</option>
              <option value="website">{t('website')}</option>
              <option value="social">{t('social')}</option>
            </select>
          </div>
          <div className="relative w-full md:w-48">
            <MapPin className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={20} />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className={`w-full ${language === 'ar' ? 'pl-4 pr-10' : 'pr-4 pl-10'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amarous-teal/50 transition-all appearance-none`}
            >
              <option value="">{t('allGovernorates')}</option>
              {EGYPT_GOVERNORATES.map((gov) => (
                <option key={gov.en} value={gov.en}>{language === 'ar' ? gov.ar : gov.en}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full md:w-48">
            <CreditCard className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={20} />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className={`w-full ${language === 'ar' ? 'pl-4 pr-10' : 'pr-4 pl-10'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amarous-teal/50 transition-all appearance-none`}
            >
              <option value="all">{t('allPaymentStatuses')}</option>
              <option value="paid">{t('paid')}</option>
              <option value="unpaid">{t('unpaid')}</option>
            </select>
          </div>
          <div className="relative w-full md:w-48">
            <Filter className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={20} />
            <select
              value={readinessFilter}
              onChange={(e) => setReadinessFilter(e.target.value as any)}
              className={`w-full ${language === 'ar' ? 'pl-4 pr-10' : 'pr-4 pl-10'} py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amarous-teal/50 transition-all appearance-none`}
            >
              <option value="all">{t('allReadiness')}</option>
              <option value="ready">{t('ready')}</option>
              <option value="not_ready">{t('notReady')}</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                <tr>
                  <th className="px-2 py-2 text-xs">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors" onClick={() => {
                      setSortConfig(prev => ({
                        key: 'createdAt',
                        direction: prev.key === 'createdAt' && prev.direction === 'desc' ? 'asc' : 'desc'
                      }));
                    }}>
                      {t('date')}
                      <Filter size={12} className={sortConfig.key === 'createdAt' ? 'text-amarous-teal' : 'text-slate-300'} />
                    </div>
                  </th>
                  <th className="px-2 py-2 text-xs">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors" onClick={() => {
                      setSortConfig(prev => ({
                        key: 'orderNumber',
                        direction: prev.key === 'orderNumber' && prev.direction === 'asc' ? 'desc' : 'asc'
                      }));
                    }}>
                      {t('invoiceNumber')}
                      <Filter size={12} className={sortConfig.key === 'orderNumber' ? 'text-amarous-teal' : 'text-slate-300'} />
                    </div>
                  </th>
                  <th className="px-2 py-2 text-xs">{t('customer')}</th>
                  <th className="px-2 py-2 text-xs">{t('location')}</th>
                  <th className="px-2 py-2 text-xs">{t('payment')}</th>
                  <th className="px-2 py-2 text-xs">{t('contact')}</th>
                  <th className="px-2 py-2 text-xs">{t('status')}</th>
                  <th className="px-2 py-2 text-xs">{t('total')}</th>
                  <th className="px-2 py-2 text-xs">{t('paidAmount')}</th>
                  <th className="px-2 py-2 text-xs">{t('balance')}</th>
                  <th className="px-2 py-2 text-xs">{t('notes')}</th>
                  <th className="px-2 py-2 text-xs">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-slate-400">
                      {t('noInvoices')}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className={`hover:bg-slate-200 transition-colors border-l-2 ${
                      order.type === 'social' ? 'bg-amarous-yellow/20 border-amarous-yellow' : 'bg-teal-200/40 border-teal-600'
                    }`}>
                      <td className="px-2 py-2">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          {order.thumbnail ? (
                            <img 
                              src={order.thumbnail} 
                              alt="Thumbnail" 
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => openDetailsModal(order)}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <FileText size={14} />
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-800 text-xs">
                              {order.orderNumber.startsWith('#') ? order.orderNumber : `#${order.orderNumber}`}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border w-fit ${
                              order.type === 'social' 
                                ? 'bg-amarous-yellow/10 text-amarous-yellow-dark border-amarous-yellow/20' 
                                : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {order.type === 'social' ? t('social') : t('website')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-slate-800 text-xs">{order.customerName}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={12} />
                          <span dir="ltr">{order.customerPhone}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1 text-slate-600 text-xs">
                          <MapPin size={14} className="text-slate-400" />
                          <span className="truncate max-w-[120px]" title={order.deliveryLocation}>
                            {order.deliveryLocation || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-1.5">
                          <button 
                            onClick={() => togglePaymentStatus(order.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit transition-colors hover:opacity-80 cursor-pointer ${order.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                            title="Toggle Payment Status"
                          >
                            {order.isPaid ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {order.isPaid ? t('paid') : t('unpaid')}
                          </button>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            {order.paymentMethod === 'Visa' ? <CreditCard size={12} /> : order.paymentMethod === 'InstaPay' ? <Smartphone size={12} /> : <Banknote size={12} />}
                            {order.paymentMethod === 'Visa' ? t('visa') : order.paymentMethod === 'InstaPay' ? t('instapay') : t('cash')}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <button 
                          onClick={() => user?.role === 'admin' && toggleContactStatus(order.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors hover:opacity-80 cursor-pointer ${order.isContacted ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                          title="Toggle Contact Status"
                          disabled={user?.role !== 'admin'}
                        >
                          {order.isContacted ? t('contacted') : t('notContacted')}
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium w-fit ${order.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {order.isReady ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {order.isReady ? t('ready') : t('notReady')}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            value={order.total || 0}
                            onChange={(e) => user?.role === 'admin' && updateOrderField(order.id, 'total', Number(e.target.value))}
                            className="w-16 px-1 py-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amarous-teal focus:bg-white transition-all text-xs font-bold text-slate-800 outline-none"
                            readOnly={user?.role !== 'admin'}
                          />
                          <span className="text-[9px] text-slate-400 font-bold">EGP</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            value={order.paidAmount || 0}
                            onChange={(e) => user?.role === 'admin' && updateOrderField(order.id, 'paidAmount', Number(e.target.value))}
                            className={`w-16 px-1 py-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white transition-all text-xs font-bold outline-none ${order.paidAmount >= order.total ? 'text-emerald-600' : 'text-slate-700'}`}
                            readOnly={user?.role !== 'admin'}
                          />
                          <span className="text-[9px] text-slate-400 font-bold">EGP</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-rose-600">{(order.total || 0) - (order.paidAmount || 0)}</span>
                          <span className="text-[9px] text-slate-400 font-bold">EGP</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <textarea 
                          value={order.notes || ''}
                          onChange={(e) => user?.role === 'admin' && updateOrderField(order.id, 'notes', e.target.value)}
                          placeholder={t('notes')}
                          rows={1}
                          className="w-full min-w-[120px] px-1 py-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amarous-teal focus:bg-white transition-all text-xs text-slate-600 outline-none resize-none overflow-hidden"
                          readOnly={user?.role !== 'admin'}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openDetailsModal(order)} className="p-1.5 text-slate-400 hover:text-amarous-teal hover:bg-amarous-teal/10 rounded-lg transition-colors" title={t('viewDetails')}>
                            <Eye size={16} />
                          </button>
                          {user?.role === 'admin' && (
                            <>
                              <button onClick={() => openEditModal(order)} className="p-1.5 text-slate-400 hover:text-amarous-yellow-dark hover:bg-amarous-yellow/10 rounded-lg transition-colors" title={t('edit')}>
                                <FileText size={16} />
                              </button>
                              <button onClick={() => handleDeleteOrder(order.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title={t('delete')}>
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Progress Indicator following mouse */}
      {progress.active && (
        <div 
          className="fixed z-[9999] pointer-events-none flex flex-col items-center gap-2 transition-transform duration-75 ease-out"
          style={{ 
            left: mousePos.x + 20, 
            top: mousePos.y + 20,
            transform: 'translate(0, 0)'
          }}
        >
          <div className="bg-white/90 backdrop-blur-md border border-amarous-teal/30 shadow-2xl rounded-2xl p-3 flex items-center gap-3 min-w-[140px]">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-slate-100"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={113.1}
                  strokeDashoffset={113.1 - (113.1 * progress.percent) / 100}
                  className="text-amarous-teal transition-all duration-300 ease-in-out"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-black text-slate-700">{progress.percent}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-amarous-teal uppercase tracking-widest leading-none mb-1">
                {progress.message}
              </span>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-amarous-teal animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 rounded-full bg-amarous-teal animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 rounded-full bg-amarous-teal animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <OrderModal 
          order={selectedOrder} 
          type={modalType}
          orders={orders}
          onClose={() => setIsModalOpen(false)} 
          onSave={selectedOrder?.id ? handleEditOrder : handleAddOrder} 
          onBatchUpload={async (files) => {
            setIsAiLoading(true);
            const extracted: Order[] = [];
            for (let i = 0; i < files.length; i++) {
              try {
                // Add a larger delay between files to avoid hitting rate limits too fast
                // 5 seconds is safer for free tier limits
                if (i > 0) await new Promise(resolve => setTimeout(resolve, 5000));
                
                const order = await processBatchFile(files[i]);
                if (order) extracted.push(order);
              } catch (err: any) {
                console.error(`Error processing batch file ${files[i].name}:`, err);
                alert(`خطأ في معالجة الملف ${files[i].name}: ${err.message || 'خطأ غير معروف'}`);
              }
            }
            setPendingOrders(extracted);
            setIsBatchPreviewOpen(true);
            setIsAiLoading(false);
          }}
          userRole={user?.role}
        />
      )}

      {isDetailsModalOpen && selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setIsDetailsModalOpen(false)} 
          onUpdate={handleEditOrder}
          userRole={user?.role}
        />
      )}

      {/* User Activity Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amarous-teal/10 rounded-xl text-amarous-teal">
                  <History size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{t('userActivity')}</h2>
              </div>
              <button onClick={() => setIsActivityModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    {t('noFiles')}
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <User size={20} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{activity.username}</p>
                          <p className="text-xs text-slate-500">{activity.action}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-400">
                          {new Date(activity.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Management Modal */}
      {isUsersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amarous-teal/10 rounded-xl text-amarous-teal">
                  <User size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{t('userManagement')}</h2>
              </div>
              <button onClick={() => setIsUsersModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const formData = new FormData(form);
                  handleAddUser({
                    username: formData.get('username'),
                    password: formData.get('password'),
                    fullName: formData.get('fullName'),
                    phone: formData.get('phone'),
                    role: formData.get('role')
                  });
                  form.reset();
                }}
                className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4"
              >
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{t('addUser')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <input name="username" placeholder={t('username')} className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amarous-teal/50" required />
                  <input name="password" type="password" placeholder={t('password')} className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amarous-teal/50" required />
                  <input name="fullName" placeholder={t('fullName') || 'Full Name'} className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amarous-teal/50" />
                  <input name="phone" placeholder={t('phone') || 'Phone'} className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amarous-teal/50" />
                  <select name="role" className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amarous-teal/50" required>
                    <option value="admin">{t('admin')}</option>
                    <option value="manager">{t('manager')}</option>
                    <option value="stock_keeper">{t('stock_keeper')}</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-amarous-teal text-white py-2 rounded-xl font-bold hover:bg-amarous-teal-dark transition-colors">
                  {t('addUser')}
                </button>
              </form>

              <div className="space-y-4">
                {users.map((u) => (
                  <div key={u.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-50 rounded-xl">
                          <User size={20} className="text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800">{u.username}</p>
                            {u.plainPassword && (
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                                <Lock size={10} />
                                {u.plainPassword}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-rose-100 text-rose-700' : 
                            u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {t(u.role)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.id !== user?.id && (
                          <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Edit User Form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const formData = new FormData(form);
                        handleUpdateUser(u.id, {
                          username: formData.get('username'),
                          password: formData.get('password') || undefined,
                          fullName: formData.get('fullName'),
                          phone: formData.get('phone'),
                          role: formData.get('role')
                        });
                      }}
                      className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-50"
                    >
                      <input name="username" defaultValue={u.username} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200" required />
                      <div className="relative">
                        <input 
                          name="password" 
                          type={visiblePasswords[u.id] ? 'text' : 'password'} 
                          placeholder={t('newPassword')} 
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 pr-8" 
                        />
                        <button 
                          type="button"
                          onClick={() => setVisiblePasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                          className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
                        >
                          {visiblePasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <input name="fullName" defaultValue={u.fullName} placeholder={t('fullName') || 'Full Name'} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200" />
                      <input name="phone" defaultValue={u.phone} placeholder={t('phone') || 'Phone'} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200" />
                      <select name="role" defaultValue={u.role} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200" required>
                        <option value="admin">{t('admin')}</option>
                        <option value="manager">{t('manager')}</option>
                        <option value="stock_keeper">{t('stock_keeper')}</option>
                      </select>
                      <button type="submit" className="bg-slate-800 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors">
                        {t('save')}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal */}
      {isMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amarous-teal/10 rounded-xl text-amarous-teal">
                  <Cloud size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{t('mediaLibrary')}</h2>
              </div>
              <button onClick={() => setIsMediaModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 uppercase tracking-wider">{t('files')}</h3>
                <label className="flex items-center gap-2 px-4 py-2 bg-amarous-teal text-white rounded-xl font-bold cursor-pointer hover:bg-amarous-teal-dark transition-colors">
                  <UploadCloud size={20} />
                  {t('upload')}
                  <input 
                    type="file" 
                    className="hidden" 
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files) return;
                      for (const file of Array.from(files) as File[]) {
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const base64 = ev.target?.result as string;
                          handleAddMedia({
                            name: file.name,
                            dataUrl: base64,
                            type: file.type
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Logo Section */}
                <div className="group relative aspect-square bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center justify-center overflow-hidden hover:border-amarous-teal transition-all shadow-sm">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                      <ImageIcon size={32} />
                      <span className="text-[10px] font-bold uppercase mt-1">Logo</span>
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (ev) => {
                              const base64 = ev.target?.result as string;
                              await apiFetch('/api/settings/logo', {
                                method: 'POST',
                                body: JSON.stringify({ logo: base64 })
                              });
                              setLogoUrl(base64);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="text-white flex flex-col items-center gap-1">
                        <ImageIcon size={20} />
                        <span className="text-[10px] font-bold uppercase">{t('changeLogo')}</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Background Section */}
                <div className="group relative aspect-square bg-slate-50 rounded-2xl border border-slate-200 p-4 flex items-center justify-center overflow-hidden hover:border-amarous-teal transition-all shadow-sm">
                  {backgroundUrl ? (
                    <img src={backgroundUrl} alt="Background" className="max-w-full max-h-full object-cover rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                      <ImageIcon size={32} />
                      <span className="text-[10px] font-bold uppercase mt-1">Background</span>
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (ev) => {
                              const base64 = ev.target?.result as string;
                              await apiFetch('/api/settings/background', {
                                method: 'POST',
                                body: JSON.stringify({ background: base64 })
                              });
                              setBackgroundUrl(base64);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="text-white flex flex-col items-center gap-1">
                        <ImageIcon size={20} />
                        <span className="text-[10px] font-bold uppercase">{t('changeBackground')}</span>
                      </div>
                    </label>
                  )}
                </div>
                
                {/* Media Files */}
                {media.map((m: any) => (
                  <div key={m.id} className="group relative aspect-square bg-slate-50 rounded-2xl border border-slate-200 p-2 flex items-center justify-center overflow-hidden hover:border-amarous-teal transition-all shadow-sm">
                    {m.type?.startsWith('image/') ? (
                      <img src={m.dataUrl} alt={m.name} className="max-w-full max-h-full object-cover rounded-lg" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FileText size={32} />
                        <span className="text-[10px] truncate w-full text-center px-2">{m.name}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <a href={m.dataUrl} download={m.name} className="p-2 bg-white rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">
                        <Download size={20} />
                      </a>
                      <button onClick={() => handleDeleteMedia(m.id)} className="p-2 bg-rose-500 rounded-lg text-white hover:bg-rose-600 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Legacy Order Files */}
                {orders.flatMap(o => o.pdfFiles || []).map((file, idx) => (
                  <div key={`order-${idx}`} className="group relative aspect-square bg-slate-50 rounded-2xl border border-slate-200 p-2 flex items-center justify-center overflow-hidden hover:border-amarous-teal transition-all shadow-sm opacity-60">
                    {file.mimeType?.startsWith('image/') ? (
                      <img src={file.dataUrl} alt="Order File" className="max-w-full max-h-full object-cover rounded-lg" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FileText size={32} />
                        <span className="text-[10px] truncate w-full text-center px-2">{file.name}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a href={file.dataUrl} download={file.name} className="text-white text-[10px] font-bold uppercase tracking-widest hover:underline">
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Preview Modal */}
      {isBatchPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amarous-teal/10 rounded-xl text-amarous-teal">
                  <FileText size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{t('batchPreview') || 'Batch Preview'}</h2>
              </div>
              <button onClick={() => setIsBatchPreviewOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              <div className="grid grid-cols-1 gap-8">
                {pendingOrders.map((order, idx) => (
                  <div key={order.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 relative group shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className="flex flex-col xl:flex-row gap-10">
                      {/* Left: Image/PDF Preview */}
                      <div className="w-full xl:w-80 aspect-[3/4] bg-white rounded-3xl border border-slate-200 overflow-hidden flex items-center justify-center relative shadow-inner group-hover:border-amarous-teal/30 transition-colors">
                        <div className="absolute top-4 left-4 z-10">
                          <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm ${order.type === 'website' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                            {t(order.type)}
                          </span>
                        </div>
                        {order.thumbnail ? (
                          <img src={order.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                        ) : order.pdfFiles[0]?.mimeType.startsWith('image/') ? (
                          <img src={order.pdfFiles[0].dataUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-slate-300">
                            <FileText size={80} strokeWidth={1.5} />
                            <span className="text-xs font-bold mt-4 uppercase tracking-[0.2em]">PDF Document</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Right: Detailed Fields */}
                      <div className="flex-1 space-y-8">
                        {/* Section 1: Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('invoiceNumber')}</label>
                            <input 
                              value={order.orderNumber}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].orderNumber = e.target.value;
                                setPendingOrders(newOrders);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none font-bold text-slate-700 shadow-sm transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('customerName')}</label>
                            <input 
                              value={order.customerName}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].customerName = e.target.value;
                                setPendingOrders(newOrders);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none font-bold text-slate-700 shadow-sm transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('customerPhone')}</label>
                            <input 
                              value={order.customerPhone}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].customerPhone = e.target.value;
                                setPendingOrders(newOrders);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none font-bold text-slate-700 shadow-sm transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('deliveryLocation')}</label>
                            <input 
                              value={order.deliveryLocation}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].deliveryLocation = e.target.value;
                                setPendingOrders(newOrders);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none font-bold text-slate-700 shadow-sm transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('paymentMethod')}</label>
                            <select 
                              value={order.paymentMethod}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].paymentMethod = e.target.value as any;
                                setPendingOrders(newOrders);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none font-bold text-slate-700 shadow-sm transition-all"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Visa">Visa</option>
                              <option value="InstaPay">InstaPay</option>
                            </select>
                          </div>
                          <div className="space-y-2 flex flex-col justify-end">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const newOrders = [...pendingOrders];
                                  newOrders[idx].isPaid = !newOrders[idx].isPaid;
                                  if (newOrders[idx].isPaid) newOrders[idx].paidAmount = newOrders[idx].total + newOrders[idx].shippingCost - newOrders[idx].discount;
                                  else newOrders[idx].paidAmount = 0;
                                  setPendingOrders(newOrders);
                                }}
                                className={`flex-1 py-3 rounded-2xl font-bold transition-all ${order.isPaid ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-500'}`}
                              >
                                {order.isPaid ? t('paid') : t('unpaid')}
                              </button>
                              <button
                                onClick={() => {
                                  const newOrders = [...pendingOrders];
                                  newOrders[idx].isContacted = !newOrders[idx].isContacted;
                                  setPendingOrders(newOrders);
                                }}
                                className={`flex-1 py-3 rounded-2xl font-bold transition-all ${order.isContacted ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-500'}`}
                              >
                                {order.isContacted ? t('contacted') : t('notContacted') || 'Not Contacted'}
                              </button>
                              <button
                                onClick={() => {
                                  const newOrders = [...pendingOrders];
                                  newOrders[idx].isReady = !newOrders[idx].isReady;
                                  setPendingOrders(newOrders);
                                }}
                                className={`flex-1 py-3 rounded-2xl font-bold transition-all ${order.isReady ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-500'}`}
                              >
                                {order.isReady ? t('ready') : t('notReady') || 'Not Ready'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Financials */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('total')}</label>
                            <input 
                              type="number"
                              value={order.total}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].total = Number(e.target.value);
                                setPendingOrders(newOrders);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none font-black text-slate-800"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('shippingCost')}</label>
                            <input 
                              type="number"
                              value={order.shippingCost}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].shippingCost = Number(e.target.value);
                                setPendingOrders(newOrders);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none font-black text-slate-800"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('discount')}</label>
                            <input 
                              type="number"
                              value={order.discount}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].discount = Number(e.target.value);
                                setPendingOrders(newOrders);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none font-black text-slate-800"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('paidAmount')}</label>
                            <input 
                              type="number"
                              value={order.paidAmount}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].paidAmount = Number(e.target.value);
                                newOrders[idx].isPaid = newOrders[idx].paidAmount >= (newOrders[idx].total + newOrders[idx].shippingCost - newOrders[idx].discount);
                                setPendingOrders(newOrders);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none font-black text-emerald-600"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('balance')}</label>
                            <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 font-black text-rose-600">
                              {(order.total + order.shippingCost - order.discount) - order.paidAmount}
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Products & Notes */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('products')}</label>
                            <div className="space-y-2">
                              {order.productDetails.map((p, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group/item">
                                  <input 
                                    value={p.name}
                                    onChange={(e) => {
                                      const newOrders = [...pendingOrders];
                                      newOrders[idx].productDetails[pIdx].name = e.target.value;
                                      setPendingOrders(newOrders);
                                    }}
                                    className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-700"
                                  />
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-300">x</span>
                                    <input 
                                      type="number"
                                      value={p.quantity}
                                      onChange={(e) => {
                                        const newOrders = [...pendingOrders];
                                        newOrders[idx].productDetails[pIdx].quantity = Number(e.target.value);
                                        setPendingOrders(newOrders);
                                      }}
                                      className="w-10 bg-slate-50 border border-slate-100 rounded-lg px-1 py-1 text-center text-xs font-black text-amarous-teal"
                                    />
                                  </div>
                                  <button 
                                    onClick={() => {
                                      const newOrders = [...pendingOrders];
                                      newOrders[idx].productDetails = newOrders[idx].productDetails.filter((_, i) => i !== pIdx);
                                      setPendingOrders(newOrders);
                                    }}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                              <button 
                                onClick={() => {
                                  const newOrders = [...pendingOrders];
                                  newOrders[idx].productDetails.push({ name: 'New Product', price: 0, unitPrice: 0, quantity: 1 });
                                  setPendingOrders(newOrders);
                                }}
                                className="w-full py-2 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-amarous-teal/50 hover:text-amarous-teal transition-all flex items-center justify-center gap-2 text-xs font-bold"
                              >
                                <Plus size={14} />
                                {t('addItem')}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('notes')}</label>
                            <textarea 
                              value={order.notes}
                              onChange={(e) => {
                                const newOrders = [...pendingOrders];
                                newOrders[idx].notes = e.target.value;
                                setPendingOrders(newOrders);
                              }}
                              className="w-full h-[140px] bg-white border border-slate-200 rounded-[2rem] px-5 py-4 focus:ring-4 focus:ring-amarous-teal/10 focus:border-amarous-teal outline-none text-xs font-medium text-slate-600 resize-none shadow-sm"
                              placeholder={t('addNotesHere')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Floating Delete Button */}
                    <button 
                      onClick={() => setPendingOrders(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-3 -right-3 w-10 h-10 bg-white text-rose-500 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all hover:scale-110 active:scale-90"
                      title={t('delete')}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {pendingOrders.length} {t('itemsToSave') || 'items to save'}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsBatchPreviewOpen(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleBatchSave}
                  disabled={isAiLoading || pendingOrders.length === 0}
                  className="px-8 py-2.5 bg-amarous-teal text-white rounded-xl font-bold hover:bg-amarous-teal-dark transition-all shadow-lg shadow-amarous-teal/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {t('saveAll') || 'Save All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Programming Modal */}
      {isProgrammingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col border border-slate-700">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amarous-teal/10 rounded-xl text-amarous-teal">
                  <Terminal size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">{t('aiProgramming')}</h2>
              </div>
              <div className="flex items-center gap-2">
                {aiHistory.length > 0 && (
                  <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                    <button 
                      onClick={handleAiUndo}
                      disabled={aiHistoryIndex <= -1}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30"
                      title={t('undo')}
                    >
                      <History size={18} />
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    <button 
                      onClick={handleAiRedo}
                      disabled={aiHistoryIndex >= aiHistory.length - 1}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 rotate-180"
                      title={t('redo') || 'Redo'}
                    >
                      <History size={18} />
                    </button>
                  </div>
                )}
                <button onClick={() => setIsProgrammingModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X size={24} className="text-slate-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {aiHistory.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{t('history')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {aiHistory.map((h, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          setAiResponse(h.response);
                          setAiHistoryIndex(i);
                        }}
                        className={`px-3 py-1.5 border rounded-lg text-xs transition-all truncate max-w-[150px] ${aiHistoryIndex === i ? 'bg-amarous-teal/20 border-amarous-teal text-amarous-teal' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-amarous-teal hover:border-amarous-teal'}`}
                        title={h.prompt}
                      >
                        {h.prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                  {t('aiPromptPlaceholder')}
                </p>
                <div className="relative">
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full h-48 bg-slate-950 text-emerald-400 font-mono text-sm p-4 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amarous-teal/50 resize-none"
                    placeholder="Enter your prompt here..."
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={aiFileInputRef}
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files) {
                          const newFiles = [];
                          for (let i = 0; i < files.length; i++) {
                            const base64 = await new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.readAsDataURL(files[i]);
                              reader.onload = () => resolve(reader.result as string);
                            });
                            newFiles.push({ name: files[i].name, dataUrl: base64, mimeType: files[i].type });
                          }
                          setAiFiles(prev => [...prev, ...newFiles]);
                        }
                      }}
                      multiple
                    />
                    <button 
                      onClick={() => aiFileInputRef.current?.click()}
                      className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                      title="Upload files"
                    >
                      <Paperclip size={20} />
                    </button>
                  </div>
                </div>

                {aiFiles.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {aiFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-400">
                        <span className="truncate max-w-[100px]">{f.name}</span>
                        <button onClick={() => setAiFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-400">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {aiResponse && (
                <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 max-h-[400px] overflow-auto">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Markdown>{aiResponse}</Markdown>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleAiProgramming}
                disabled={isAiLoading || !aiPrompt.trim()}
                className="w-full bg-amarous-teal text-white py-4 rounded-2xl font-bold text-lg hover:bg-amarous-teal-dark transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amarous-teal/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAiLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Code size={20} />
                )}
                {t('processRequest')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Cloud Button */}
      {user?.role === 'admin' && (
        <button 
          onClick={fetchMedia}
          className={`fixed bottom-8 ${language === 'ar' ? 'left-8' : 'right-8'} z-40 p-4 bg-white text-amarous-teal rounded-2xl shadow-lg border border-slate-200 hover:bg-slate-50 hover:scale-110 transition-all group`}
          title={t('mediaLibrary')}
        >
          <Cloud size={28} />
          <div className={`absolute bottom-full mb-2 ${language === 'ar' ? 'left-0' : 'right-0'} bg-slate-800 text-white text-[10px] py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`}>
            {t('mediaLibrary')}
          </div>
        </button>
      )}
    </div>
  );
}
