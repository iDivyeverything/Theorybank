"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { type Square } from "chess.js";
import { ArrowLeft, ArrowUpDown, BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, GitBranch, HelpCircle, Pause, Play, RotateCcw, Volume2, VolumeX, View, X, SlidersHorizontal, Moon, Sun } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { Environment } from "@/components/environments/Environment";
import { AmbientEvent } from "@/components/environments/AmbientEvent";
import { useSurfAudio } from "@/components/environments/useSurfAudio";
import { environments } from "@/lib/environments/registry";
import { activeLine, createStudy, gameAt, navigateTo, playMove, seedStudy, type MoveInput, type Study } from "@/lib/chess/study";
import { STARTER_LINES, openingsForSquare, type OpeningLine } from "@/lib/chess/openings";
import { CAMERA_TRAVEL_MS } from "@/lib/chess/presentation";

const environment = environments["tropical-shore"];
const initialStudy=createStudy();
const pieceNames:Record<string,string>={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
type Phase="ambient"|"choose"|"study";
type ModelContext = { registerTool: (tool: { name:string; title:string; description:string; inputSchema:object; annotations:object; execute:(input:unknown)=>unknown }, options:{signal:AbortSignal}) => void|Promise<void> };

export default function Home() {
  const [phase,setPhase]=useState<Phase>("ambient");
  const [revealed,setRevealed]=useState(false);
  const [arriving,setArriving]=useState(false);
  const [gpuScene,setGpuScene]=useState(false);
  const sceneRoot=useRef<HTMLElement>(null);
  const cameraFrame=useCallback((progress:number)=>{sceneRoot.current?.style.setProperty("--camera-progress",String(progress));},[]);
  const [daylight,setDaylight]=useState(100);
  const [motion,setMotion]=useState<{id:number;pieceType:string}|undefined>();
  const motionId=useRef(0),arrivalTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const audioPreference=useRef(false);
  const [studies,setStudies]=useState<Record<string,Study>>({free:initialStudy});
  const [activeStudy,setActiveStudy]=useState("free");
  const [selected,setSelected]=useState<Square|null>(null);
  const [pickerSquare,setPickerSquare]=useState<string|null>(null);
  const [browseAll,setBrowseAll]=useState(false);
  const [flipped,setFlipped]=useState(false);
  const [topView,setTopView]=useState(false);
  const [resetKey,setResetKey]=useState(0);
  const [paused,setPaused]=useState(false);
  const [pieceFocus,setPieceFocus]=useState("all");
  const [notice,setNotice]=useState("");
  const [promotion,setPromotion]=useState<{from:Square;to:Square}|null>(null);
  const [freshOpen,setFreshOpen]=useState(false);
  const [showBranches,setShowBranches]=useState(false);
  const surf=useSurfAudio();
  const toggleSound=()=>{audioPreference.current=true;void surf.toggle();};
  const enterStudy=()=>{
    if(!audioPreference.current){audioPreference.current=true;void surf.setEnabled(true);}
    setSelected(null);setPickerSquare(null);setBrowseAll(false);
    // Only the first entrance is a sunrise. Beach returns retain scene light.
    const firstEntrance=!revealed;setRevealed(true);
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setPhase("choose");return;}
    setArriving(true);
    arrivalTimer.current=setTimeout(()=>{
      setPhase("choose");
      arrivalTimer.current=setTimeout(()=>setArriving(false),CAMERA_TRAVEL_MS+100);
    },firstEntrance?1250:0);
  };
  const changeDaylight=(value:number)=>{setDaylight(value);try{localStorage.setItem("theorybank.scene-light.v1",String(value));}catch{}};
  useEffect(()=>{
    try{const saved=localStorage.getItem("theorybank.scene-light.v1");if(saved!==null){const value=Number(saved);if(Number.isFinite(value))setDaylight(Math.max(0,Math.min(100,value)));}}catch{}
    return()=>{if(arrivalTimer.current)clearTimeout(arrivalTimer.current);};
  },[]);
  const study=studies[activeStudy];
  const stateRef=useRef({study,activeStudy,studies,phase});stateRef.current={study,activeStudy,studies,phase};
  const game=useMemo(()=>gameAt(phase==="study"?study:initialStudy),[study,phase]);
  const line=useMemo(()=>activeLine(study),[study]);
  const current=study.nodes[study.currentId];
  const example=STARTER_LINES.find(example=>example.id===activeStudy);
  const moveScroll=useRef<HTMLDivElement>(null);
  const destinations=useMemo(()=>phase==="study"&&selected?game.moves({square:selected,verbose:true}).map(move=>move.to):[],[game,selected,phase]);
  const status=game.isCheckmate()?`Checkmate · ${game.turn()==="w"?"Black":"White"} wins`:game.isStalemate()?"Stalemate":game.isThreefoldRepetition()?"Draw · repetition":game.isInsufficientMaterial()?"Draw · insufficient material":game.isDraw()?"Draw":`${game.turn()==="w"?"White":"Black"} to move${game.isCheck()?" · Check":""}`;
  const pieces=useMemo(()=>game.board().flat().filter((piece):piece is NonNullable<typeof piece>=>!!piece),[game]);
  const position=useMemo(()=>({pieces,selected:phase==="choose"?pickerSquare:selected,destinations:phase==="choose"?["e4","d4","c4","f3"]:destinations,lastMove:phase==="study"?{from:current.from,to:current.to}:undefined,checkSquare:game.isCheck()?pieces.find(p=>p.type==="k"&&p.color===game.turn())?.square:undefined,focusType:phase==="study"&&pieceFocus!=="all"?pieceFocus:undefined,motion:phase==="study"?motion:undefined}),[pieces,selected,destinations,current,game,phase,pickerSquare,pieceFocus,motion]);
  const branches=Object.values(study.nodes).filter(node=>node.children.length>1);
  const options=useMemo(()=>pickerSquare?openingsForSquare(pickerSquare):STARTER_LINES,[pickerSquare]);
  const picking=phase==="choose"&&(pickerSquare!==null||browseAll);

  const updateStudy=useCallback((next:Study)=>{
    const id=stateRef.current.activeStudy;
    stateRef.current={...stateRef.current,study:next,studies:{...stateRef.current.studies,[id]:next}};
    setStudies(previous=>({...previous,[id]:next}));setSelected(null);setNotice("");setMotion(undefined);
  },[]);
  const move=useCallback((input:MoveInput)=>{
    const before=gameAt(stateRef.current.study),next=playMove(stateRef.current.study,input),from=next.nodes[next.currentId].from;
    updateStudy(next);setMotion({id:++motionId.current,pieceType:from?before.get(from)?.type||"p":"p"});return next;
  },[updateStudy]);
  const go=useCallback((id:string)=>updateStudy(navigateTo(stateRef.current.study,id)),[updateStudy]);
  const chooseOpening=(opening?:OpeningLine)=>{
    const id=opening?.id||"free";
    let next=studies[id];
    if(!next){next=seedStudy(opening?.moves||[]);next=navigateTo(next,activeLine(next).at(-1)?.id||"root");}
    stateRef.current={study:next,activeStudy:id,studies:{...studies,[id]:next},phase:"study"};
    setStudies(previous=>({...previous,[id]:next}));setActiveStudy(id);setPhase("study");
    setSelected(null);setPickerSquare(null);setBrowseAll(false);setNotice("");setShowBranches(false);setMotion(undefined);
  };
  const onSquare=useCallback((squareName:string)=>{
    if(phase==="ambient")return;
    if(phase==="choose"){setPickerSquare(squareName);setBrowseAll(false);return;}
    const square=squareName as Square;
    if(selected===square){setSelected(null);setNotice("");return;}
    if(selected&&destinations.includes(square)){
      const piece=game.get(selected);
      if(piece?.type==="p"&&(square[1]==="1"||square[1]==="8")){setPromotion({from:selected,to:square});return;}
      try{move({from:selected,to:square});}catch{setNotice("That move is not legal in this position.");}return;
    }
    const piece=game.get(square);
    if(piece?.color===game.turn()){setSelected(square);setNotice(`${square} · ${pieceNames[piece.type]}`);}
    else{setSelected(null);setNotice(selected?"Choose a highlighted square.":"Select a piece of the side to move.");}
  },[selected,destinations,game,move,phase]);
  const navigate=useCallback((direction:"first"|"previous"|"next"|"last")=>{
    const state=stateRef.current.study,node=state.nodes[state.currentId],path=activeLine(state);
    const id=direction==="first"?"root":direction==="previous"?(node.parentId||"root"):direction==="last"?(path.at(-1)?.id||"root"):(state.preferredChild[node.id]||node.children[0]||node.id);
    go(id);
  },[go]);
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");setPaused(media.matches);
    const change=()=>setPaused(media.matches);media.addEventListener("change",change);return()=>media.removeEventListener("change",change);
  },[]);
  useEffect(()=>{
    const keyboard=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement;
      if(target.closest("input,select,textarea,[role='dialog'],[role='combobox'],.chess-board-component")||document.querySelector("[role='dialog'],[role='alertdialog'],[role='listbox']"))return;
      if(phase==="study"&&event.key==="ArrowLeft"){event.preventDefault();navigate("previous");}
      if(phase==="study"&&event.key==="ArrowRight"){event.preventDefault();navigate("next");}
      if(event.key==="Escape"){setSelected(null);setPickerSquare(null);setBrowseAll(false);setShowBranches(false);}
    };window.addEventListener("keydown",keyboard);return()=>window.removeEventListener("keydown",keyboard);
  },[navigate,phase]);
  useEffect(()=>{
    const container=moveScroll.current,button=container?.querySelector<HTMLElement>("[aria-current='step']");
    if(container&&button)container.scrollTo({left:button.offsetLeft-container.clientWidth/2+button.clientWidth/2,behavior:"instant"});
  },[study.currentId,phase]);

  useEffect(()=>{
    const context=(document as unknown as {modelContext?:ModelContext}).modelContext;if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    const register=(tool:Parameters<ModelContext["registerTool"]>[0])=>{try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
    register({name:"read_chess_study",title:"Read chess study",description:"Read the current study, legal moves, notation and preserved branches.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>{
      const state=stateRef.current.study,chess=gameAt(state);return {mode:stateRef.current.phase,fen:chess.fen(),turn:chess.turn(),currentNode:state.currentId,legalMoves:chess.moves(),line:activeLine(state).map(n=>({id:n.id,san:n.san})),branches:Object.values(state.nodes).filter(n=>n.children.length>1).map(n=>({parent:n.id,children:n.children.map(id=>({id,san:state.nodes[id].san}))}))};
    }});
    register({name:"play_chess_move",title:"Play chess move",description:"Play a legal move in the local study, preserving alternate branches. Opens the study board.",inputSchema:{type:"object",properties:{move:{type:"string",description:"Standard algebraic notation, e.g. e4, Nf3, O-O."}},required:["move"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input)=>{
      if(!input||typeof input!=="object"||!("move"in input)||typeof input.move!=="string"||Object.keys(input).some(key=>key!=="move"))throw new Error("Provide one move as a string.");
      let next:Study;flushSync(()=>{setRevealed(true);setPhase("study");next=move(input.move as string);});return {fen:next!.nodes[next!.currentId].fen,currentNode:next!.currentId,san:next!.nodes[next!.currentId].san};
    }});
    register({name:"navigate_chess_study",title:"Navigate chess study",description:"Open an existing position without deleting any moves or branches.",inputSchema:{type:"object",properties:{nodeId:{type:"string"}},required:["nodeId"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input)=>{
      if(!input||typeof input!=="object"||!("nodeId"in input)||typeof input.nodeId!=="string"||Object.keys(input).some(key=>key!=="nodeId"))throw new Error("Provide a nodeId string.");
      const next=navigateTo(stateRef.current.study,input.nodeId);flushSync(()=>{setRevealed(true);setPhase("study");updateStudy(next);});return {fen:next.nodes[next.currentId].fen,currentNode:next.currentId};
    }});
    return()=>lifecycle.abort();
  },[updateStudy,move]);

  return <main ref={sceneRoot} className={`theorybank phase-${phase}${picking?" has-picker":""}${!revealed?" is-unrevealed":""}${arriving?" is-arriving":""}${gpuScene?" has-world-scene":""}`} aria-busy={arriving} style={{"--scene-light":.43+daylight*.0057,"--scene-saturation":.76+daylight*.0024,"--night-veil":(1-daylight/100)*.25} as CSSProperties}>
    {!gpuScene&&<div className="fallback-scene"><Environment environment={environment} paused={paused}/><AmbientEvent environment={environment} paused={paused} active={revealed&&!arriving}/></div>}
    <div className="scene-shade" aria-hidden="true"/>
    {phase==="ambient"&&<><button className="study-invitation" onClick={enterStudy} disabled={arriving} aria-label="Study — reveal the island and approach the chessboard">Study</button><button className="icon-button entrance-sound" onClick={toggleSound} aria-pressed={surf.enabled} aria-label={surf.enabled?"Turn island sound off":"Turn island sound on"} title={surf.enabled?"Sound off":"Wind and waves"}>{surf.enabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button></>}
    <section className="board-stage" aria-label="Chessboard on a teak table">
      <ChessBoard position={position} lighting={environment.boardLighting} table={environment.table} environment={environment} paused={paused} eventsActive={revealed&&!arriving} onCameraFrame={cameraFrame} onBackend={setGpuScene} flipped={flipped} topView={topView} resetKey={resetKey} distant={phase==="ambient"} interactive={phase!=="ambient"&&!arriving} choosing={phase==="choose"} onSquare={onSquare} onLand={surf.playImpact}/>
    </section>
    {phase!=="ambient"&&<>
      <header className="study-header">
        <button className="text-button return-beach" onClick={()=>{setPhase("ambient");setSelected(null);}}><ArrowLeft size={17}/> <span>Beach</span></button>
        <span className="wordmark">Theorybank</span>
        <div className="scene-controls">
          <button className="icon-button" onClick={()=>setPaused(!paused)} aria-label={paused?"Resume scene motion":"Pause scene motion"} title={paused?"Resume scene motion":"Pause scene motion"}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>
          <button className="icon-button" onClick={toggleSound} aria-pressed={surf.enabled} aria-label={surf.enabled?"Turn island sound off":"Turn island sound on"} title={surf.enabled?"Sound off":"Wind, waves and stone pieces"}>{surf.enabled?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>
          <Dialog><DialogTrigger asChild><button className="icon-button" aria-label="Scene settings" title="Scene settings"><SlidersHorizontal size={17}/></button></DialogTrigger><DialogContent className="quiet-dialog scene-settings"><DialogHeader><DialogTitle>Your light, your pace.</DialogTitle><DialogDescription>Set the island anywhere between moonlight and daylight.</DialogDescription></DialogHeader><div className="light-control"><div className="light-presets"><button onClick={()=>changeDaylight(0)}><Moon size={17}/>Night</button><button onClick={()=>changeDaylight(100)}>Day<Sun size={18}/></button></div><Slider thumbLabel="Scene brightness" value={[daylight]} min={0} max={100} step={1} onValueChange={([value])=>changeDaylight(value)}/><p>{daylight<30?"Moonlit":daylight<70?"Soft light":"Daylight"} · {daylight}%</p></div><div className="settings-row"><span>Wind, waves & stone</span><button className="text-button" onClick={toggleSound} aria-pressed={surf.enabled}>{surf.enabled?"Sound on":"Sound off"}</button></div><div className="settings-row"><span>Scene motion</span><button className="text-button" onClick={()=>setPaused(!paused)} aria-pressed={!paused}>{paused?"Paused":"Playing"}</button></div><p className="settings-note">The stone set has gently varied weight, motion and sound. Night keeps the board visible; it is lighter than the entrance.</p></DialogContent></Dialog>
          <Dialog><DialogTrigger asChild><button className="icon-button" aria-label="Study help"><HelpCircle size={17}/></button></DialogTrigger><DialogContent className="quiet-dialog"><DialogHeader><DialogTitle>A little room to think.</DialogTitle><DialogDescription>Explore both sides, at your own pace.</DialogDescription></DialogHeader><div className="help-copy"><p><strong>Choose a line.</strong> Tap any board square to find starter lines whose moves begin or end there. Choose a line to see its final position, or explore a fresh board.</p><p><strong>Move and revisit.</strong> Select a piece, then a highlighted square. You control both colors, using legal chess moves. Click the notation to revisit a position. A different move creates a branch.</p><p><strong>Look closer.</strong> The piece filter dims everything except your chosen piece type. All pieces remain on the board and follow the same rules.</p><p><strong>Keyboard.</strong> Tab to the board, use arrows to choose a square, then Enter. Outside the board, left and right arrows step through moves. Right-drag the board to look around.</p><p><strong>Stay awhile.</strong> The beach is continuously animated, with optional synthesized surf. Pause stops scenery and occasional events.</p><p className="small-note">22 starter lines are available now. Studies last for this visit; saved repertoires and structure lessons are planned.</p></div></DialogContent></Dialog>
        </div>
      </header>
      {phase==="choose"?<>
        <div className="chooser-heading"><h1>Where shall we begin?</h1><p>Choose a square. Discover its openings.</p></div>
        {picking&&<aside className="opening-picker glass" aria-label="Opening choices">
          <div className="picker-title"><div><span className="eyebrow">STARTER LINES</span><h2>{pickerSquare?`Through ${pickerSquare}`:"Openings"}</h2></div><button className="icon-button" aria-label="Close opening choices" onClick={()=>{setPickerSquare(null);setBrowseAll(false);}}><X size={18}/></button></div>
          <div className="opening-options">{options.length?options.map(opening=><button key={opening.id} onClick={()=>chooseOpening(opening)} className="opening-option"><span>{opening.name}</span><small>{opening.pgn}</small></button>):<p className="empty-choice">No starter line uses {pickerSquare} yet. Try e4, d4, c4 or f3.</p>}</div>
          <div className="picker-footer"><span>{options.length} {options.length===1?"line":"lines"}</span>{pickerSquare&&<button className="text-button" onClick={()=>{setPickerSquare(null);setBrowseAll(true);}}>All starter lines</button>}</div>
        </aside>}
        <div className="choose-actions glass"><button onClick={()=>{setPickerSquare(null);setBrowseAll(true);}}><BookOpen size={16}/>Browse lines</button><span aria-hidden="true"/><button onClick={()=>chooseOpening()}>Free exploration</button>{study.currentId!=="root"&&<><span aria-hidden="true"/><button onClick={()=>setPhase("study")}>Resume</button></>}</div>
      </>:<>
        <div className="study-heading"><button className="opening-title" onClick={()=>{setPhase("choose");setPickerSquare(null);setSelected(null);setBrowseAll(false);}}><BookOpen size={15}/><span>{example?.name||"Free exploration"}</span><ChevronRight size={15}/></button></div>
        <div className="study-dock">
          {showBranches&&<div className="variation-tray glass"><div className="variation-heading"><span>Variations</span><button className="icon-button" aria-label="Close variations" onClick={()=>setShowBranches(false)}><X size={16}/></button></div>{branches.map(parent=><div className="branch-row" key={parent.id}><span>{Math.floor(parent.ply/2)+1}{parent.ply%2?"…":"."}</span>{parent.children.map(id=><button key={id} onClick={()=>go(id)} aria-pressed={study.preferredChild[parent.id]===id}>{study.nodes[id].san}</button>)}</div>)}</div>}
          <div className="move-ribbon glass" aria-label="Study moves">
            <button className="icon-button" onClick={()=>navigate("first")} disabled={study.currentId==="root"} aria-label="First position"><ChevronsLeft size={18}/></button>
            <button className="icon-button" onClick={()=>navigate("previous")} disabled={!current.parentId} aria-label="Previous move"><ChevronLeft size={19}/></button>
            <div className="notation-scroll" ref={moveScroll}>
              {line.length?<ol className="notation">{line.map((node,index)=><li key={node.id}>{index%2===0&&<span className="move-number">{index/2+1}.</span>}<button onClick={()=>go(node.id)} aria-label={`Go to ${Math.floor(index/2)+1}${index%2?"...":"."} ${node.san}`} aria-current={node.id===study.currentId?"step":undefined} className={node.ply>current.ply?"future-move":""}>{node.san}</button></li>)}</ol>:<span className="empty-notation">Your move.</span>}
            </div>
            <button className="icon-button" onClick={()=>navigate("next")} disabled={!current.children.length} aria-label="Next move"><ChevronRight size={19}/></button>
            <button className="icon-button" onClick={()=>navigate("last")} disabled={!current.children.length} aria-label="Last position"><ChevronsRight size={18}/></button>
          </div>
          <div className="board-controls glass">
            <span className="turn-status" aria-live="polite"><i className={game.turn()==="w"?"white-token":"black-token"}/>{status}</span>
            <Select value={pieceFocus} onValueChange={setPieceFocus}><SelectTrigger className="piece-filter" aria-label="Focus on a piece type"><SelectValue/></SelectTrigger><SelectContent className="piece-options">{[["all","All pieces"],["p","Pawns"],["n","Knights"],["b","Bishops"],["r","Rooks"],["q","Queens"],["k","Kings"]].map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
            <div className="board-tools"><button className="icon-button" onClick={()=>setFlipped(!flipped)} aria-label="Flip board" title="Flip board"><ArrowUpDown size={17}/></button><button className="icon-button" onClick={()=>setTopView(!topView)} aria-label={topView?"Perspective view":"Overhead view"} title={topView?"Perspective view":"Overhead view"} aria-pressed={topView}><View size={18}/></button><button className="icon-button" onClick={()=>{setTopView(false);setResetKey(n=>n+1);}} aria-label="Reset camera" title="Reset camera"><RotateCcw size={16}/></button>{branches.length>0&&<button className="icon-button" onClick={()=>setShowBranches(!showBranches)} aria-label="Show variations" title="Variations" aria-pressed={showBranches}><GitBranch size={17}/></button>}</div>
          </div>
          <div className="study-caption"><span aria-live="polite">{notice||surf.error||(current.children.length===0&&example?"End of starter line · explore your own continuation":"Select a piece, then a square")}</span><button className="text-button" onClick={()=>setFreshOpen(true)}>New board</button></div>
        </div>
      </>}
    </>}
    <Dialog open={!!promotion} onOpenChange={open=>{if(!open)setPromotion(null);}}><DialogContent className="quiet-dialog"><DialogHeader><DialogTitle>Choose your piece</DialogTitle><DialogDescription>Promote your pawn.</DialogDescription></DialogHeader><div className="promotion-options">{[["q","Queen","♕"],["r","Rook","♖"],["b","Bishop","♗"],["n","Knight","♘"]].map(([type,name,symbol])=><button key={type} onClick={()=>{if(promotion)move({...promotion,promotion:type});setPromotion(null);}}><span>{symbol}</span>{name}</button>)}</div></DialogContent></Dialog>
    <AlertDialog open={freshOpen} onOpenChange={setFreshOpen}><AlertDialogContent className="quiet-dialog"><AlertDialogHeader><AlertDialogTitle>A fresh board?</AlertDialogTitle><AlertDialogDescription>This clears free exploration for this visit. Your other opening studies stay in place.</AlertDialogDescription></AlertDialogHeader><div className="fresh-actions"><AlertDialogCancel>Keep studying</AlertDialogCancel><AlertDialogAction onClick={()=>{const next=createStudy();setStudies(previous=>({...previous,free:next}));setActiveStudy("free");setPhase("study");setSelected(null);setNotice("");setShowBranches(false);}}>Start fresh</AlertDialogAction></div></AlertDialogContent></AlertDialog>
  </main>;
}
