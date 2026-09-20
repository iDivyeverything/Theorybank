"use client";
import { useEffect, useRef, useState } from "react";
import type { BoardRenderer, BoardPosition, BoardLighting } from "./board-renderer";
import type { TableAppearance } from "@/lib/chess/presentation";
import type { StudyEnvironment } from "@/lib/environments/registry";

export function ChessBoard({ position, lighting, table, environment, paused, eventsActive, onCameraFrame, onBackend, flipped, topView, resetKey, distant=false, interactive=true, choosing=false, onSquare, onLand }: {
  position:BoardPosition; lighting:BoardLighting; table:TableAppearance; flipped:boolean; topView:boolean; resetKey:number; distant?:boolean; interactive?:boolean; choosing?:boolean; onSquare:(square:string)=>void; onLand:(pieceType:string)=>void;
  environment:StudyEnvironment;paused:boolean;eventsActive:boolean;onCameraFrame:(progress:number)=>void;onBackend:(gpu:boolean)=>void;
}) {
  const host=useRef<HTMLDivElement>(null);
  const renderer=useRef<BoardRenderer|null>(null);
  const onSquareRef=useRef(onSquare);onSquareRef.current=onSquare;
  const onLandRef=useRef(onLand);onLandRef.current=onLand;
  const cameraRef=useRef(onCameraFrame);cameraRef.current=onCameraFrame;
  const backendRef=useRef(onBackend);backendRef.current=onBackend;
  const sceneRef=useRef({paused,eventsActive});sceneRef.current={paused,eventsActive};
  const interactiveRef=useRef(interactive);interactiveRef.current=interactive;
  const positionRef=useRef(position);positionRef.current=position;
  const [ready,setReady]=useState(false);
  const [fallback,setFallback]=useState(false);
  const [keyboardSquare,setKeyboardSquare]=useState("e2");
  const viewRef=useRef({flipped,topView,distant});viewRef.current={flipped,topView,distant};
  useEffect(()=>{
    let cancelled=false;
    import("./board-renderer").then(({BoardRenderer})=>{
      if(cancelled||!host.current)return;
      try{
        renderer.current=new BoardRenderer(host.current,lighting,square=>{if(interactiveRef.current)onSquareRef.current(square);},table,type=>onLandRef.current(type),environment,progress=>cameraRef.current(progress),gpu=>backendRef.current(gpu));
        renderer.current.setSceneState(sceneRef.current.paused,sceneRef.current.eventsActive);
        renderer.current.update(positionRef.current);renderer.current.setView(viewRef.current.flipped,viewRef.current.topView,viewRef.current.distant);setReady(true);
      }catch{host.current?.querySelector("canvas")?.remove();setFallback(true);setReady(true);}
    }).catch(()=>{setFallback(true);setReady(true);});
    return()=>{cancelled=true;renderer.current?.dispose();renderer.current=null;};
  },[lighting,table,environment]);
  useEffect(()=>{renderer.current?.setSceneState(paused,eventsActive);},[paused,eventsActive]);
  useEffect(()=>{renderer.current?.update(position);},[position]);
  useEffect(()=>{renderer.current?.setView(flipped,topView,distant);},[flipped,topView,distant,resetKey]);
  const keyboard=(event:React.KeyboardEvent)=>{
    if(!interactive)return;
    if(event.key==="Enter"||event.key===" "){event.preventDefault();onSquare(keyboardSquare);return;}
    const deltas:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
    const delta=deltas[event.key];if(!delta)return;event.preventDefault();event.stopPropagation();
    const sign=flipped?-1:1;
    const file=Math.max(0,Math.min(7,keyboardSquare.charCodeAt(0)-97+delta[0]*sign));
    const rank=Math.max(1,Math.min(8,Number(keyboardSquare[1])+delta[1]*sign));
    setKeyboardSquare(String.fromCharCode(97+file)+rank);
  };
  const symbols:Record<string,string>={wk:"♔",wq:"♕",wr:"♖",wb:"♗",wn:"♘",wp:"♙",bk:"♚",bq:"♛",br:"♜",bb:"♝",bn:"♞",bp:"♟"};
  return <div className="chess-board-component" tabIndex={interactive?0:-1} role="group" aria-label={choosing?"Opening board. Choose any square to see related starter lines. Use arrow keys and Enter.":"Interactive chessboard. Select a piece, then a destination. Use arrow keys to choose a square and Enter to select it."} onKeyDown={keyboard}>
    <div ref={host} className="board-mount"/>
    {!ready&&<div className="board-loading"><span className="loading-knight">♞</span><span>Setting the board…</span></div>}
    {fallback&&<div className="fallback-wrap"><p>Simple board</p><div className="fallback-board">{Array.from({length:64},(_,i)=>{
      const file=flipped?7-i%8:i%8,rank=flipped?Math.floor(i/8)+1:8-Math.floor(i/8),square=String.fromCharCode(97+file)+rank;
      const piece=position.pieces.find(p=>p.square===square);
      return <button key={square} aria-label={`${square}${piece?`, ${piece.color==="w"?"white":"black"} ${piece.type}`:""}`} className={`${(file+rank)%2?"light-square":"dark-square"} ${position.selected===square?"square-selected":""}`} tabIndex={-1} onClick={()=>onSquare(square)}><span style={{opacity:position.focusType&&piece?.type!==position.focusType? .18:1}}>{piece?symbols[piece.color+piece.type]:position.destinations.includes(square)?"·":""}</span></button>;
    })}</div></div>}
    <div className="keyboard-square" aria-live="polite">{keyboardSquare} · Enter to select</div>
  </div>;
}
