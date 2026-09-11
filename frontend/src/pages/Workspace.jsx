import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Scale, CheckSquare, MessageSquare, Plus, ExternalLink, X, Copy } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { getWorkspace, createTask, postDiscussion, getWorkspaceFiles, addWorkspaceFile, generateLegalDocument, getLegalDocuments } from '../services/startups.js';
import { useActiveStartup } from '../context/ActiveStartupContext.jsx';
import { useToast } from '../components/Toast.jsx';

/**
 * Where the team actually works.
 *
 * Two real dead ends, both fixed:
 *
 * 1. Every discussion message was attributed to 'Team member'. The service
 *    did a bare SELECT * with no author join, so the UI genuinely had no
 *    name to show. A discussion where you cannot tell who said what is not
 *    a discussion. Fixed in workspaceService.
 *
 * 2. You could generate a founders agreement or an NDA and then never read
 *    it. The content was stored and the list showed only a type and a date.
 *    A document you cannot open is not a document.
 */

const AVATAR_TONES = [
  { bg: '#EED8FF', fg: '#6D28D9' },
  { bg: '#D1EAFE', fg: '#1677E8' },
  { bg: '#EAF7F0', fg: '#1F5D52' },
  { bg: '#FFE8DA', fg: '#E84C32' },
];
const toneFor = (n) => AVATAR_TONES[(n || '?').charCodeAt(0) % AVATAR_TONES.length];

const FIELD = 'px-3.5 py-2.5 rounded-lg border border-surface-border bg-surface-muted text-[14px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:bg-surface transition-colors';

const DOC_LABEL = {
  FOUNDERS_AGREEMENT: 'Founders agreement',
  NDA: 'Non-disclosure agreement',
  CONTRIBUTOR_AGREEMENT: 'Contributor agreement',
};

export default function Workspace() {
  const { activeStartup, loading: startupLoading } = useActiveStartup();
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
  const [openDoc, setOpenDoc] = useState(null);

  async function load(startupId) {
    const [wsRes, filesRes, legalRes] = await Promise.all([
      getWorkspace(startupId), getWorkspaceFiles(startupId), getLegalDocuments(startupId),
    ]);
    if (wsRes.ok && wsRes.data.success) { setTasks(wsRes.data.tasks); setDiscussions(wsRes.data.discussions); }
    if (filesRes.ok && filesRes.data.success) setFiles(filesRes.data.files);
    if (legalRes.ok && legalRes.data.success) setLegalDocs(legalRes.data.documents);
  }

  useEffect(() => {
    async function init() {
      if (startupLoading) return;
      if (activeStartup) { setStartup(activeStartup); await load(activeStartup.id); }
      setLoading(false);
    }
    init();
  }, [activeStartup?.id, startupLoading]);

  async function handleAddTask() {
    if (!newTask.trim() || !startup) return;
    const { ok, data } = await createTask(startup.id, { title: newTask });
    if (ok && data.success) { setNewTask(''); await load(startup.id); }
    else showToast('Could not add that.', 'error');
  }

  async function handlePost() {
    if (!newMessage.trim() || !startup) return;
    const { ok, data } = await postDiscussion(startup.id, newMessage);
    if (ok && data.success) { setNewMessage(''); await load(startup.id); }
    else showToast('Could not post that.', 'error');
  }

  async function handleAddFile() {
    if (!newFileName.trim() || !newFileUrl.trim() || !startup) return;
    const { ok, data } = await addWorkspaceFile(startup.id, { fileName: newFileName, fileUrl: newFileUrl });
    if (ok && data.success) { setNewFileName(''); setNewFileUrl(''); await load(startup.id); showToast('Attached.'); }
    else showToast('Could not attach that.', 'error');
  }

  async function handleGenerateLegal(type) {
    if (!startup) return;
    setGeneratingLegal(true);
    const { ok, data } = await generateLegalDocument(startup.id, type);
    setGeneratingLegal(false);
    if (ok && data.success) { await load(startup.id); showToast('Drafted. Have a lawyer read it before anyone signs.'); }
    else showToast(data.detail || data.error || 'Could not draft that.', 'error');
  }

  function copyDoc(doc) {
    navigator.clipboard?.writeText(doc.content || '').then(
      () => showToast('Copied.'),
      () => showToast('Could not copy.', 'error')
    );
  }

  if (loading) {
    return (
      <Shell title="Workspace">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-surface-border border-t-violet-500 animate-spin" />
        </div>
      </Shell>
    );
  }

  const openTasks = tasks.filter((t) => t.status !== 'DONE' && t.status !== 'COMPLETED');

  return (
    <Shell title={startup?.name || 'Workspace'} subtitle="Only your team sees this">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-violet-600 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          {openTasks.length > 0 ? `${openTasks.length} open` : 'Nothing outstanding'}
        </p>
        <h1 className="font-editorial italic text-[32px] text-trust-fg leading-tight max-w-3xl">
          Everything the team is carrying, in one place.
        </h1>
      </div>

      <div className="grid grid-cols-5 gap-5 mb-5">
        <div className="col-span-3 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={16} className="text-violet-600" />
            <p className="text-[15px] font-semibold text-ink-950">What needs doing</p>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Add something…"
              className={`flex-1 ${FIELD}`}
            />
            <button onClick={handleAddTask} className="flex items-center gap-1.5 bg-ink-900 hover:bg-ink-700 text-white px-4 rounded-lg text-[13px] font-medium transition-colors">
              <Plus size={14} /> Add
            </button>
          </div>
          {tasks.length === 0 ? (
            <p className="text-[13.5px] text-ink-500 py-10 text-center">Nothing on the list yet.</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-4 py-3.5">
                  <p className="text-[14.5px] text-ink-900 min-w-0 truncate">{t.title}</p>
                  <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-surface-muted text-ink-700 shrink-0 capitalize">
                    {String(t.status || '').replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2 bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-violet-600" />
            <p className="text-[15px] font-semibold text-ink-950">Team chat</p>
          </div>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePost()}
            placeholder="Say something…"
            className={`w-full mb-4 ${FIELD}`}
          />
          {discussions.length === 0 ? (
            <p className="text-[13.5px] text-ink-500 py-10 text-center">Nothing said yet.</p>
          ) : (
            <div className="space-y-4 max-h-[320px] overflow-y-auto">
              {discussions.map((d) => {
                const name = d.author_name || 'Someone';
                const tone = toneFor(name);
                return (
                  <div key={d.id} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[12.5px] font-semibold shrink-0"
                      style={{ backgroundColor: tone.bg, color: tone.fg }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        {/* Was 'Team member' for everyone, because the query
                            never joined the author. */}
                        <p className="text-[13.5px] font-medium text-ink-950">{name}</p>
                        <span className="text-[11px] text-ink-300">
                          {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-[13.5px] text-ink-700 leading-relaxed mt-0.5">{d.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-violet-600" />
            <p className="text-[15px] font-semibold text-ink-950">Shared links</p>
          </div>
          <div className="flex gap-2 mb-4">
            <input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="What is it" className={`flex-1 min-w-0 ${FIELD}`} />
            <input value={newFileUrl} onChange={(e) => setNewFileUrl(e.target.value)} placeholder="Link" className={`flex-1 min-w-0 ${FIELD}`} />
            <button onClick={handleAddFile} className="bg-ink-900 hover:bg-ink-700 text-white px-4 rounded-lg text-[13px] font-medium transition-colors shrink-0">Add</button>
          </div>
          {files.length === 0 ? (
            <p className="text-[13.5px] text-ink-500 py-8 text-center">Nothing shared yet.</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {files.map((f) => (
                <a
                  key={f.id}
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 py-3"
                >
                  <span className="text-[14px] text-ink-900 group-hover:text-violet-700 transition-colors truncate">{f.file_name}</span>
                  <ExternalLink size={13} className="text-ink-300 group-hover:text-violet-600 transition-colors shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-surface-border shadow-card p-7">
          <div className="flex items-center gap-2 mb-1">
            <Scale size={16} className="text-violet-600" />
            <p className="text-[15px] font-semibold text-ink-950">Paperwork</p>
          </div>
          <p className="text-[13px] text-ink-500 mb-4">Drafts to start from. Have a lawyer read anything before it is signed.</p>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleGenerateLegal('FOUNDERS_AGREEMENT')}
              disabled={generatingLegal}
              className="text-[13px] bg-surface-muted hover:bg-surface-border text-ink-900 px-3.5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {generatingLegal ? 'Drafting…' : 'Founders agreement'}
            </button>
            <button
              onClick={() => handleGenerateLegal('NDA')}
              disabled={generatingLegal}
              className="text-[13px] bg-surface-muted hover:bg-surface-border text-ink-900 px-3.5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              NDA
            </button>
          </div>
          {legalDocs.length === 0 ? (
            <p className="text-[13.5px] text-ink-500 py-8 text-center">Nothing drafted yet.</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {legalDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setOpenDoc(d)}
                  className="group w-full text-left flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] text-ink-900 group-hover:text-violet-700 transition-colors">
                      {DOC_LABEL[d.document_type] || String(d.document_type).replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11.5px] text-ink-300 mt-0.5">
                      {new Date(d.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-[12.5px] font-medium text-ink-500 group-hover:text-violet-700 transition-colors shrink-0">Read</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* You could previously generate a founders agreement and then never
          read it. The content was stored all along. */}
      {openDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink-950/40" onClick={() => setOpenDoc(null)}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-2xl shadow-elevated w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-surface-border">
              <div>
                <p className="text-[17px] font-semibold text-ink-950">
                  {DOC_LABEL[openDoc.document_type] || String(openDoc.document_type).replace(/_/g, ' ')}
                </p>
                <p className="text-[12.5px] text-ink-500 mt-0.5">
                  Drafted {new Date(openDoc.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · not reviewed by a lawyer
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyDoc(openDoc)}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-violet-700 border border-surface-border px-3.5 py-2 rounded-full transition-colors"
                >
                  <Copy size={13} /> Copy
                </button>
                <button onClick={() => setOpenDoc(null)} className="text-ink-300 hover:text-ink-900 p-2 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-7 py-6">
              <pre className="text-[14px] text-ink-900 leading-relaxed whitespace-pre-wrap font-sans">{openDoc.content}</pre>
            </div>
          </motion.div>
        </div>
      )}
    </Shell>
  );
}
