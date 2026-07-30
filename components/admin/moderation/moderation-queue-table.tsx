"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EditorialBulkToolbar } from "@/components/admin/editorial/editorial-bulk-toolbar";
import { EditorialStatusBadge } from "@/components/admin/editorial/editorial-status-badge";
import { bulkStoryAction, assignStoryAction } from "@/lib/actions/admin/moderation";
import type { ModerationLookups, QueueRow } from "@/lib/data/admin/moderation";
import type { ModerationAdminCopy } from "./content";

type BulkAction="approve"|"reject"|"publish"|"unpublish"|"archive"|"restore"|"assign"|"reassign"|"release";
type Optimistic={ids:string[];action:BulkAction;assigneeId:string|null};
function update(rows:QueueRow[],change:Optimistic){const ids=new Set(change.ids);return rows.map((row)=>{if(!ids.has(row.submissionId))return row;
  if(change.action==="assign"||change.action==="reassign")return{...row,assignedModeratorId:change.assigneeId,assignedModeratorName:null,status:row.status==="PENDING"?"IN_REVIEW":row.status};
  if(change.action==="release")return{...row,assignedModeratorId:null,assignedModeratorName:null};
  const next:Partial<Record<BulkAction,QueueRow["status"]>>={approve:"APPROVED",reject:"REJECTED",publish:"PUBLISHED",unpublish:"APPROVED",archive:"ARCHIVED",restore:"APPROVED"};
  return next[change.action]?{...row,status:next[change.action]!}:row;});}
function count(template:string,count:number){const [one,many=one]=template.split("|");return(count===1?one:many).replace("{count}",String(count));}

export function ModerationQueueTable({items,copy,lookups,currentUserId,canAssign,canDisposition,canPublish,locale}:{items:QueueRow[];copy:ModerationAdminCopy;lookups:ModerationLookups;currentUserId:string;canAssign:boolean;canDisposition:boolean;canPublish:boolean;locale:string}){
  const [selected,setSelected]=useState<string[]>([]);const [action,setAction]=useState<BulkAction>(canDisposition?"approve":"assign");
  const [assignee,setAssignee]=useState(currentUserId);const [reason,setReason]=useState("");const [notice,setNotice]=useState<{ok:boolean;text:string}|null>(null);
  const [pending,startTransition]=useTransition();const [optimistic,applyOptimistic]=useOptimistic(items,update);const router=useRouter();
  const actions=useMemo(()=>[
    ...(canDisposition?["approve","reject"] as BulkAction[]:[]),...(canPublish?["publish","unpublish","archive","restore"] as BulkAction[]:[]),
    "assign" as BulkAction,...(canAssign?["reassign"] as BulkAction[]:[]),"release" as BulkAction,
  ],[canAssign,canDisposition,canPublish]);
  useEffect(()=>{function shortcut(event:KeyboardEvent){if(event.key==="/"&&!event.metaKey&&!event.ctrlKey&&!event.altKey){const target=event.target as HTMLElement|null;if(target?.matches("input,textarea,select,[contenteditable=true]"))return;event.preventDefault();document.getElementById("moderation-search")?.focus();}}window.addEventListener("keydown",shortcut);return()=>window.removeEventListener("keydown",shortcut);},[]);
  const all=items.length>0&&selected.length===items.length;
  function runBulk(){if(!selected.length)return;setNotice(null);const assigneeId=action==="assign"||action==="reassign"?assignee:null;applyOptimistic({ids:selected,action,assigneeId});startTransition(async()=>{const result=await bulkStoryAction({submissionIds:selected,action,assigneeId,reasonCode:action==="reject"?reason:null});if(!result.ok){setNotice({ok:false,text:`${copy.bulkError} (${result.requestId})`});router.refresh();return;}setNotice({ok:true,text:[count(copy.bulkUpdated,result.bulk.updated),count(copy.bulkSkipped,result.bulk.skipped),count(copy.bulkAlready,result.bulk.already)].join(" · ")});setSelected([]);router.refresh();});}
  function assignSelf(id:string){applyOptimistic({ids:[id],action:"assign",assigneeId:currentUserId});startTransition(async()=>{const result=await assignStoryAction(id,currentUserId);if(!result.ok)setNotice({ok:false,text:`${copy.error} (${result.requestId})`});router.refresh();});}
  const date=(value:string)=>{try{return new Intl.DateTimeFormat(locale==="zar"?"en":locale,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}catch{return value.slice(0,16);}};
  return <div className="space-y-4">
    <EditorialBulkToolbar
      label={copy.bulkAction}
      selected={copy.selected.replace("{count}",String(selected.length))}
      notice={notice?.text}
      noticeIsError={notice ? !notice.ok : false}
    >
        <label><span className="mb-1 block text-xs font-semibold text-ink-soft">{copy.bulkAction}</span><select value={action} onChange={(e)=>setAction(e.target.value as BulkAction)} className="h-10 rounded-md border border-line bg-surface px-3 text-sm">{actions.map((value)=><option key={value} value={value}>{copy[value]}</option>)}</select></label>
        {(action==="assign"||action==="reassign")?<label><span className="mb-1 block text-xs font-semibold text-ink-soft">{copy.moderator}</span><select value={assignee} onChange={(e)=>setAssignee(e.target.value)} className="h-10 rounded-md border border-line bg-surface px-3 text-sm">{lookups.moderators.map((item)=><option key={item.userId} value={item.userId}>{item.displayName}</option>)}</select></label>:null}
        {action==="reject"?<label><span className="mb-1 block text-xs font-semibold text-ink-soft">{copy.rejectionReason}</span><select value={reason} onChange={(e)=>setReason(e.target.value)} className="h-10 max-w-72 rounded-md border border-line bg-surface px-3 text-sm"><option value="">{copy.chooseReason}</option>{lookups.rejectionReasons.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>:null}
        <Button type="button" onClick={runBulk} disabled={pending||!selected.length||(action==="reject"&&!reason)}>{copy.bulkApply}</Button>
    </EditorialBulkToolbar>
    <div className="overflow-x-auto rounded-xl border border-line bg-surface"><table className="w-full min-w-[900px] border-collapse text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-ink-soft"><tr>
      <th className="px-4 py-3"><input type="checkbox" aria-label={copy.selectAll} checked={all} onChange={()=>setSelected(all?[]:items.map((item)=>item.submissionId))}/></th><th className="px-4 py-3">{copy.submission}</th><th className="px-4 py-3">{copy.submitted}</th><th className="px-4 py-3">{copy.language}</th><th className="px-4 py-3">{copy.country}</th><th className="px-4 py-3">{copy.status}</th><th className="px-4 py-3">{copy.risk}</th><th className="px-4 py-3">{copy.moderator}</th><th className="px-4 py-3">{copy.lastActivity}</th><th className="px-4 py-3">{copy.actions}</th>
    </tr></thead><tbody className="divide-y divide-line">{optimistic.map((row)=><tr key={row.submissionId} className="align-top hover:bg-stone-50/70"><td className="px-4 py-4"><input type="checkbox" aria-label={copy.selectOne.replace("{id}",row.submissionId.slice(0,8))} checked={selected.includes(row.submissionId)} onChange={()=>setSelected((values)=>values.includes(row.submissionId)?values.filter((id)=>id!==row.submissionId):[...values,row.submissionId])}/></td><td className="px-4 py-4 font-mono text-xs">{row.submissionId.slice(0,8)}</td><td className="px-4 py-4 whitespace-nowrap">{date(row.submittedAt)}</td><td className="px-4 py-4 uppercase">{row.languageCode}</td><td className="px-4 py-4">{row.country??copy.notProvided}</td><td className="px-4 py-4"><EditorialStatusBadge status={row.status} label={copy.states[row.status]??row.status}/></td><td className="px-4 py-4">{copy.risks[row.riskLevel]}</td><td className="px-4 py-4">{row.assignedModeratorName??copy.unassigned}</td><td className="px-4 py-4 whitespace-nowrap">{date(row.lastActivity)}</td><td className="px-4 py-4"><div className="flex gap-2"><Link className="font-semibold text-brand-700 hover:underline" href={`/admin/moderation/${row.submissionId}`}>{copy.review}</Link>{!row.assignedModeratorId?<button type="button" className="font-semibold text-ink-soft hover:text-ink" onClick={()=>assignSelf(row.submissionId)} disabled={pending}>{copy.assignSelf}</button>:null}</div></td></tr>)}</tbody></table></div>
  </div>;
}
