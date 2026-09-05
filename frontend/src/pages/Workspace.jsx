import React, { useState, useEffect } from 'react';
import { LayoutGrid, FileText, Scale } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import AvatarRow from '../components/charts/AvatarRow.jsx';
import { getMyStartups, getWorkspace, createTask, postDiscussion, getWorkspaceFiles, addWorkspaceFile, generateLegalDocument, getLegalDocuments } from '../services/startups.js';
import { useToast } from '../components/Toast.jsx';

export default function Workspace() {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [files, setFiles] = useState([]);
  const [legalDocs, setLegalDocs] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [generatingLegal, setGeneratingLegal] = useState(false);

  async function load(startupId) {
    const [wsRes, filesRes, legalRes] = await Promise.all([getWorkspace(startupId), getWorkspaceFiles(startupId), getLegalDocuments(startupId)]);
    if (wsRes.ok && wsRes.data.success) { setTasks(wsRes.data.tasks); setDiscussions(wsRes.data.discussions); }
    if (filesRes.ok && filesRes.data.success) setFiles(filesRes.data.files);
    if (legalRes.ok && legalRes.data.success) setLegalDocs(legalRes.data.documents);
  }

  useEffect(() => {
    async function init() {
      const { ok, data } = await getMyStartups();
      if (ok && data.success && data.startups.length > 0) { setStartup(data.startups[0]); await load(data.startups[0].id); }
      setLoading(false);
    }
    init();
  }, []);

  async function handleAddTask() {
    if (!newTask.trim() || !startup) return;
    const { ok, data } = await createTask(startup.id, { title: newTask });
    if (ok && data.success) { setNewTask(''); await load(startup.id); }
    else showToast('Could not create task.', 'error');
  }

  async function handlePost() {
    if (!newMessage.trim() || !startup) return;
    const { ok, data } = await postDiscussion(startup.id, newMessage);
    if (ok && data.success) { setNewMessage(''); await load(startup.id); }
    else showToast('Could not post.', 'error');
  }

  async function handleAddFile() {
    if (!newFileName.trim() || !newFileUrl.trim() || !startup) return;
    const { ok, data } = await addWorkspaceFile(startup.id, { fileName: newFileName, fileUrl: newFileUrl });
    if (ok && data.success) { setNewFileName(''); setNewFileUrl(''); await load(startup.id); showToast('File attached.'); }
    else showToast('Could not attach file.', 'error');
  }

  async function handleGenerateLegal(type) {
    if (!startup) return;
    setGeneratingLegal(true);
    const { ok, data } = await generateLegalDocument(startup.id, type);
    setGeneratingLegal(false);
    if (ok && data.success) { await load(startup.id); showToast('Document generated — review with a lawyer before use.'); }
    else showToast(data.detail || data.error || 'Generation failed.', 'error');
  }

  if (loading) return <Shell title="Workspace"><div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" /></div></Shell>;

  return (
    <Shell title={startup?.name || 'Workspace'} subtitle="Team-only">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><LayoutGrid size={18} /></div>
        <h1 className="text-[26px] font-semibold text-ink-900 tracking-tight">Workspace</h1>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Tasks</p>
          <div className="flex gap-2 mb-4">
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="New task…" onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              className="flex-1 px-3 py-2 rounded-lg border border-surface-border bg-surface-muted text-[15px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            <button onClick={handleAddTask} className="text-xs bg-violet-50 text-violet-700 px-3 py-2 rounded-lg font-medium hover:bg-violet-100 transition-colors">Add</button>
          </div>
          {tasks.length === 0 ? <p className="text-[13px] text-ink-500 py-6 text-center">No tasks yet.</p> : tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
              <p className="text-[15px] text-ink-900">{t.title}</p>
              <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-500 font-medium">{t.status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4">Discussion</p>
          <div className="flex gap-2 mb-4">
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Say something…" onKeyDown={(e) => e.key === 'Enter' && handlePost()}
              className="flex-1 px-3 py-2 rounded-lg border border-surface-border bg-surface-muted text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
          </div>
          {discussions.length === 0 ? <p className="text-[13px] text-ink-500 text-center py-4">No discussion yet.</p> : discussions.map((d) => (
            <div key={d.id} className="mb-3">
              <AvatarRow initial="U" name="Team member" subtitle={new Date(d.created_at).toLocaleDateString()} />
              <p className="text-[13px] text-ink-700 pl-12 mt-1">{d.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4 flex items-center gap-2"><FileText size={16} /> Files</p>
          <div className="flex gap-2 mb-4">
            <input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="File name" className="flex-1 px-3 py-2 rounded-lg border border-surface-border bg-surface-muted text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            <input value={newFileUrl} onChange={(e) => setNewFileUrl(e.target.value)} placeholder="Link (Drive, Dropbox...)" className="flex-1 px-3 py-2 rounded-lg border border-surface-border bg-surface-muted text-[13px] focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            <button onClick={handleAddFile} className="text-xs bg-violet-50 text-violet-700 px-3 py-2 rounded-lg font-medium hover:bg-violet-100 transition-colors">Add</button>
          </div>
          {files.length === 0 ? <p className="text-[13px] text-ink-500 py-4 text-center">No files attached yet.</p> : files.map((f) => (
            <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2 border-b border-surface-border last:border-0 hover:text-violet-600 transition-colors">
              <span className="text-[15px] text-ink-900">{f.file_name}</span>
              <span className="text-xs text-ink-300">{new Date(f.created_at).toLocaleDateString()}</span>
            </a>
          ))}
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <p className="text-[15px] font-semibold text-ink-900 mb-4 flex items-center gap-2"><Scale size={16} /> Legal documents</p>
          <div className="flex gap-2 mb-4">
            <button onClick={() => handleGenerateLegal('FOUNDERS_AGREEMENT')} disabled={generatingLegal} className="text-xs bg-surface-muted text-ink-700 px-3 py-2 rounded-lg font-medium disabled:opacity-50">Founders Agreement</button>
            <button onClick={() => handleGenerateLegal('NDA')} disabled={generatingLegal} className="text-xs bg-surface-muted text-ink-700 px-3 py-2 rounded-lg font-medium disabled:opacity-50">NDA</button>
          </div>
          <p className="text-[11px] text-ink-300 mb-3">Templates only — not legal advice.</p>
          {legalDocs.length === 0 ? <p className="text-[13px] text-ink-500 py-4 text-center">No documents generated yet.</p> : legalDocs.map((d) => (
            <div key={d.id} className="py-2 border-b border-surface-border last:border-0">
              <p className="text-[15px] text-ink-900">{d.document_type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-ink-300">{new Date(d.generated_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
