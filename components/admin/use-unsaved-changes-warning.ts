"use client";
import { useEffect, useRef } from "react";

export function useUnsavedChangesWarning(isDirty:boolean,message:string){
  const dirty=useRef(isDirty);useEffect(()=>{dirty.current=isDirty;},[isDirty]);
  useEffect(()=>{const confirmLeave=()=>{if(!dirty.current)return true;const leave=window.confirm(message);if(leave)dirty.current=false;return leave;};
    const unload=(event:BeforeUnloadEvent)=>{if(!dirty.current)return;event.preventDefault();event.returnValue=message;};
    const click=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const target=event.target;const link=target instanceof Element?target.closest<HTMLAnchorElement>("a[href]"):null;if(!link||link.target==="_blank"||link.hasAttribute("download"))return;const destination=new URL(link.href,window.location.href);if(destination.href===window.location.href||destination.hash&&destination.pathname===window.location.pathname&&destination.search===window.location.search)return;if(!confirmLeave()){event.preventDefault();event.stopPropagation();}};
    const pop=()=>{if(!confirmLeave())window.history.forward();};window.addEventListener("beforeunload",unload);window.addEventListener("popstate",pop);document.addEventListener("click",click,true);return()=>{window.removeEventListener("beforeunload",unload);window.removeEventListener("popstate",pop);document.removeEventListener("click",click,true);};
  },[message]);
}
