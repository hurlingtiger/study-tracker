import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db 
} from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BookOpen, 
  CheckSquare, 
  Clock, 
  BarChart2, 
  LogOut, 
  Archive, 
  Calendar, 
  AlertCircle,
  Trash2
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');

  // App Data
  const [modules, setModules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);

  // Forms
  const [newModuleCode, setNewModuleCode] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskModuleId, setTaskModuleId] = useState('');

  const [logModuleId, setLogModuleId] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logMinutes, setLogMinutes] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logNotes, setLogNotes] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Subscriptions
  useEffect(() => {
    if (!user) {
      setModules([]);
      setTasks([]);
      setLogs([]);
      return;
    }

    const qModules = query(collection(db, 'modules'), where('userId', '==', user.uid));
    const unsubModules = onSnapshot(qModules, (snapshot) => {
      setModules(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qTasks = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qLogs = query(collection(db, 'logs'), where('userId', '==', user.uid));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubModules();
      unsubTasks();
      unsubLogs();
    };
  }, [user]);

  // Auth Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  // Module Actions
  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!newModuleCode) return;
    await addDoc(collection(db, 'modules'), {
      userId: user.uid,
      code: newModuleCode.toUpperCase(),
      name: newModuleName,
      isArchived: false,
      createdAt: serverTimestamp()
    });
    setNewModuleCode('');
    setNewModuleName('');
  };

  const handleArchiveModule = async (id, currentStatus) => {
    await updateDoc(doc(db, 'modules', id), { isArchived: !currentStatus });
  };

  const handleDeleteModule = async (id) => {
    if (window.confirm('Delete this module completely? (Archiving is usually safer!)')) {
      await deleteDoc(doc(db, 'modules', id));
    }
  };

  // Task Actions
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle || !taskDueDate || !taskModuleId) return;
    await addDoc(collection(db, 'tasks'), {
      userId: user.uid,
      title: taskTitle,
      dueDate: taskDueDate,
      moduleId: taskModuleId,
      completed: false,
      createdAt: serverTimestamp()
    });
    setTaskTitle('');
    setTaskDueDate('');
    setTaskModuleId('');
  };

  const handleToggleTask = async (id, completed) => {
    await updateDoc(doc(db, 'tasks', id), { completed: !completed });
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Delete this task?')) {
      await deleteDoc(doc(db, 'tasks', id));
    }
  };

  // Log Actions
  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!logModuleId || (!logHours && !logMinutes)) return;
    const totalMinutes = (parseInt(logHours || '0') * 60) + parseInt(logMinutes || '0');
    await addDoc(collection(db, 'logs'), {
      userId: user.uid,
      moduleId: logModuleId,
      durationMinutes: totalMinutes,
      date: logDate,
      notes: logNotes,
      createdAt: serverTimestamp()
    });
    setLogHours('');
    setLogMinutes('');
    setLogNotes('');
  };

  const handleDeleteLog = async (id) => {
    if (window.confirm('Delete this logged session?')) {
      await deleteDoc(doc(db, 'logs', id));
    }
  };

  // Derived state
  const activeModules = useMemo(() => modules.filter(m => !m.isArchived), [modules]);
  
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [tasks]);

  const stats = useMemo(() => {
    const totalMinutes = logs.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const moduleMap = {};
    
    modules.forEach(m => {
      moduleMap[m.id] = { name: m.code, minutes: 0 };
    });

    logs.forEach(log => {
      if (moduleMap[log.moduleId]) {
        moduleMap[log.moduleId].minutes += log.durationMinutes || 0;
      }
    });

    const chartData = Object.values(moduleMap).map(m => ({
      name: m.name,
      hours: parseFloat((m.minutes / 60).toFixed(1))
    }));

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      chartData
    };
  }, [logs, modules]);

  const getTaskStatus = (dueDate, completed) => {
    if (completed) return { text: 'Done', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' };
    const today = new Date().toISOString().split('T')[0];
    if (dueDate < today) return { text: 'Overdue', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' };
    if (dueDate === today) return { text: 'Due Today', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
    return { text: 'Upcoming', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' };
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 dark:text-white">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-lg border border-slate-100 dark:border-slate-700">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Caoimhes An Imp</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{isRegistering ? 'Create your account' : 'Sign in to access your modules'}</p>
          
          {authError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800">
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input 
                type="email" 
                required 
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <input 
                type="password" 
                required 
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              {isRegistering ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              onClick={() => setIsRegistering(!isRegistering)} 
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 pb-20 md:pb-6 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm transition-colors">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600 dark:text-indigo-500" size={24} />
            <h1 className="text-lg font-bold">StudyPulse</h1>
          </div>
          <button 
            onClick={() => signOut(auth)} 
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="mx-auto max-w-5xl p-4">
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'dashboard' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 size={16} /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'tasks' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare size={16} /> Tasks
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'logs' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={16} /> Log Hours
          </button>
          <button
            onClick={() => setActiveTab('modules')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === 'modules' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen size={16} /> Modules
          </button>
        </div>

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm transition-colors">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Study Time</h2>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{stats.totalHours}</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">hours logged</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm transition-colors">
              <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">Hours by Module</h2>
              <div className="h-64 w-full">
                {stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} unit="h" />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="hours" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                    No time logged yet. Add modules and log your hours to see charts!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. TASKS VIEW */}
        {activeTab === 'tasks' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm md:col-span-1 h-fit transition-colors">
              <h2 className="mb-4 font-semibold text-slate-800 dark:text-white">New Task</h2>
              <form onSubmit={handleAddTask} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm"
                    value={taskTitle} 
                    onChange={e => setTaskTitle(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Module</label>
                  <select 
                    required 
                    className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm"
                    value={taskModuleId} 
                    onChange={e => setTaskModuleId(e.target.value)}
                  >
                    <option value="">Select a Module</option>
                    {activeModules.map(m => (
                      <option key={m.id} value={m.id}>{m.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm"
                    value={taskDueDate} 
                    onChange={e => setTaskDueDate(e.target.value)} 
                  />
                </div>
                <button type="submit" className="w-full rounded bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                  Add Task
                </button>
              </form>
            </div>

            <div className="space-y-3 md:col-span-2">
              <h2 className="font-semibold text-slate-800 dark:text-white">Prioritized Task List</h2>
              {sortedTasks.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No tasks created yet.</p>}
              {sortedTasks.map(t => {
                const status = getTaskStatus(t.dueDate, t.completed);
                const module = modules.find(m => m.id === t.moduleId);
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition-colors">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={t.completed} 
                        onChange={() => handleToggleTask(t.id, t.completed)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-indigo-600 focus:ring-indigo-500" 
                      />
                      <div>
                        <p className={`text-sm font-medium ${t.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                            {module ? module.code : 'No module'}
                          </span>
                          <span className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-1">
                            <Calendar size={12} /> {t.dueDate}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border ${status.color}`}>
                        {status.text}
                      </span>
                      <button 
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. TIME TRACKING VIEW */}
        {activeTab === 'logs' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm md:col-span-1 h-fit transition-colors">
              <h2 className="mb-4 font-semibold text-slate-800 dark:text-white">Log Study Session</h2>
              <form onSubmit={handleAddLog} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Module</label>
                  <select 
                    required 
                    className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm"
                    value={logModuleId} 
                    onChange={e => setLogModuleId(e.target.value)}
                  >
                    <option value="">Select an Active Module</option>
                    {activeModules.map(m => (
                      <option key={m.id} value={m.id}>{m.code}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Hours</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm"
                      value={logHours} 
                      onChange={e => setLogHours(e.target.value)} 
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Minutes</label>
                    <input 
                      type="number" 
                      min="0"
                      max="59"
                      className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm"
                      value={logMinutes} 
                      onChange={e => setLogMinutes(e.target.value)} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm"
                    value={logDate} 
                    onChange={e => setLogDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Session Notes</label>
                  <textarea 
                    rows={3}
                    placeholder="Topics covered, links, or takeaways..."
                    className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm placeholder:text-slate-400"
                    value={logNotes} 
                    onChange={e => setLogNotes(e.target.value)} 
                  />
                </div>
                <button type="submit" className="w-full rounded bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                  Save Session
                </button>
              </form>
            </div>

            <div className="space-y-3 md:col-span-2">
              <h2 className="font-semibold text-slate-800 dark:text-white">Logged Sessions History</h2>
              {logs.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No hours logged yet.</p>}
              {logs.map(l => {
                const module = modules.find(m => m.id === l.moduleId);
                return (
                  <div key={l.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm space-y-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 dark:text-white text-sm">{module ? module.code : 'Archived Module'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{l.date}</span>
                        <button 
                          onClick={() => handleDeleteLog(l.id)}
                          className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Delete Log"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold px-2 py-0.5 rounded">
                        {Math.floor(l.durationMinutes / 60)}h {l.durationMinutes % 60}m
                      </span>
                    </div>
                    {l.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-600/50">
                        {l.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. MODULES VIEW */}
        {activeTab === 'modules' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm md:col-span-1 h-fit transition-colors">
              <h2 className="mb-4 font-semibold text-slate-800 dark:text-white">Add Module</h2>
              <form onSubmit={handleAddModule} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Module Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CS4001" 
                    required 
                    className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm placeholder:text-slate-400"
                    value={newModuleCode} 
                    onChange={e => setNewModuleCode(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Module Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Algorithms" 
                    className="w-full rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-1.5 text-sm placeholder:text-slate-400"
                    value={newModuleName} 
                    onChange={e => setNewModuleName(e.target.value)} 
                  />
                </div>
                <button type="submit" className="w-full rounded bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                  Save Module
                </button>
              </form>
            </div>

            <div className="space-y-3 md:col-span-2">
              <h2 className="font-semibold text-slate-800 dark:text-white">Your Modules</h2>
              {modules.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No modules added yet.</p>}
              {modules.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition-colors">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                      {m.code}
                      {m.isArchived && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">Archived</span>}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{m.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleArchiveModule(m.id, m.isArchived)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition-colors"
                      title={m.isArchived ? "Restore to active" : "Archive (preserves historical data)"}
                    >
                      <Archive size={16} />
                      <span className="hidden sm:inline">{m.isArchived ? 'Restore' : 'Archive'}</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteModule(m.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded transition-colors"
                      title="Permanently Delete Module"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}