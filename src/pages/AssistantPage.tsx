import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Bot, Send, Sparkles, Trash2 } from 'lucide-react';
import { useAgriPulse } from '../context/AgriPulseContext';
import { generateAssistantReply } from '../services/aiAssistantService';
import { Badge, Button, ConfirmDialog, KeyValueList, Notice, PageHeader, Panel, SourceTag, formatRelativeTime } from '../components/ui';

const PROMPT_GROUPS: { title: string; prompts: string[] }[] = [
  { title: 'Today on the farm', prompts: ['What should I check on my farm today?', 'Which tasks are pending this week?', "Explain today's weather for my crop."] },
  { title: 'Crops & soil', prompts: ['How do I investigate yellow leaves?', 'Explain soil pH in simple language.', 'When should I irrigate wheat at tillering?'] },
  { title: 'Devices & data', prompts: ['Why does my sensor node show pending pairing?', 'What does a stale reading mean?'] },
  { title: 'Schemes & market', prompts: ['Help me find suitable agricultural schemes.', 'Show me products for my selected crop.'] },
];

export const AssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, activeFarm, farms, crops, observations, activities, devices, weather, dictionary, products, schemes, chatHistory, appendChatMessage, clearChatHistory, setIsChatOpen } = useAgriPulse();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // The floating launcher duplicates this page; keep it closed while here.
    setIsChatOpen(false);
  }, [setIsChatOpen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [chatHistory, typing]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setInput('');
    appendChatMessage({ sender: 'user', text: trimmed });
    setTyping(true);
    try {
      const reply = await generateAssistantReply(trimmed, { profile, activeFarm, farms, crops, observations, activities, devices, weather, dictionary, products, schemes, recentMessages: chatHistory });
      appendChatMessage(reply);
    } finally {
      setTyping(false);
    }
  };

  const farmCrops = crops.filter((crop) => crop.farmId === activeFarm?.id);
  const farmDevices = devices.filter((device) => device.farmId === activeFarm?.id && device.status !== 'retired');
  const pending = activities.filter((activity) => activity.farmId === activeFarm?.id && activity.status === 'Pending').length;

  return (
    <div className="dashboard-page space-y-6">
      <PageHeader
        eyebrow="AI farming assistant"
        icon={<Bot size={14} />}
        title="AI farming assistant"
        description="Ask questions in plain language. Answers are built from your saved farm records, the crop and disease libraries, scheme information and transparent agronomic rules. The assistant is not connected to an external language model in this release."
        actions={<Button size="sm" variant="secondary" onClick={() => setConfirmClear(true)} disabled={chatHistory.length === 0} leadingIcon={<Trash2 size={14} />}>Clear conversation</Button>}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <SourceTag source="rule_based" />
            <Badge tone="warning" size="sm">Knowledge retrieval & rule-based guidance</Badge>
            <span>Decision support only — confirm treatments with a qualified agriculture officer.</span>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <Panel as="section" title="Conversation" subtitle={activeFarm ? `Context: ${activeFarm.name}` : 'No farm selected — answers will be general'} flush bodyClassName="flex flex-col">
          <div className="ap-chat-log" role="log" aria-live="polite" aria-label="Assistant conversation">
            {chatHistory.length === 0 && !typing && (
              <div className="m-auto max-w-md text-center">
                <Sparkles className="mx-auto h-8 w-8 text-leaf-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-900">Start with a question</p>
                <p className="mt-1 text-xs text-slate-600">Try one of the suggested prompts or ask about your crops, soil, weather, devices or schemes.</p>
              </div>
            )}
            {chatHistory.map((message) => (
              <div key={message.id} className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`ap-chat-bubble ${message.sender === 'user' ? 'ap-chat-bubble--user' : 'ap-chat-bubble--assistant'}`}>
                  {message.text}
                  {message.suggestedLinks && message.suggestedLinks.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                      {message.suggestedLinks.map((link) => (
                        <button key={link.route + link.label} type="button" onClick={() => navigate(link.route)} className="inline-flex items-center gap-1 rounded-lg border border-forest-200 bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest-800 hover:bg-forest-100">
                          {link.label}<ArrowUpRight size={11} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="mt-1 px-1 text-[10px] text-slate-400">{message.sender === 'user' ? 'You' : message.modeLabel || 'AgriPulse assistant'} · {formatRelativeTime(message.timestamp)}</span>
              </div>
            ))}
            {typing && (
              <div className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                <Sparkles size={13} className="animate-pulse text-leaf-600" aria-hidden="true" />Checking your saved farm records…
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
            <label htmlFor="assistant-page-input" className="sr-only">Ask an agricultural question</label>
            <input id="assistant-page-input" className="ap-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about crops, irrigation, soil, weather, devices or schemes…" autoComplete="off" disabled={typing} />
            <Button type="submit" loading={typing} iconOnly aria-label="Send question"><Send size={16} /></Button>
          </form>
        </Panel>

        <div className="space-y-4">
          <Panel as="aside" title="What the assistant can see" subtitle="Only your own saved records — nothing is sent to third parties.">
            <KeyValueList
              items={[
                { label: 'Farm in scope', value: activeFarm?.name || 'None selected' },
                { label: 'Crop records', value: `${farmCrops.length}` },
                { label: 'Observations', value: `${observations.filter((obs) => obs.farmId === activeFarm?.id).length}` },
                { label: 'Pending tasks', value: `${pending}` },
                { label: 'Devices', value: `${farmDevices.length}` },
                { label: 'Weather source', value: weather.sourceProvider },
              ]}
            />
          </Panel>

          <Panel as="aside" title="Suggested prompts">
            <div className="space-y-3">
              {PROMPT_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="ap-section-label">{group.title}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {group.prompts.map((prompt) => (
                      <button key={prompt} type="button" disabled={typing} onClick={() => void send(prompt)} className="ap-chip">{prompt}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Notice tone="neutral" title="How answers are labelled">
            Each reply shows its mode — knowledge retrieval, rule-based guidance or device registry lookup. A connected AI service would be labelled separately and is not configured.
          </Notice>
        </div>
      </div>

      <ConfirmDialog open={confirmClear} title="Clear this conversation?" description="All messages will be removed from your workspace. This cannot be undone." confirmLabel="Clear conversation" destructive onConfirm={() => { clearChatHistory(); setConfirmClear(false); }} onCancel={() => setConfirmClear(false)} />
    </div>
  );
};

export default AssistantPage;
