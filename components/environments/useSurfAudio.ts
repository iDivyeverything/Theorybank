"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { STONE_PIECE_FEEL } from "@/lib/chess/presentation";

// Local synthesis after a user gesture: no recordings, remote audio or autoplay.
// A single master controls surf, wind and stone-on-wood contact.
export function useSurfAudio() {
  const [enabled,setEnabledState]=useState(false),[error,setError]=useState("");
  const enabledRef=useRef(false);
  const audio=useRef<{context:AudioContext;master:GainNode;interval:ReturnType<typeof setInterval>;impactNoise:AudioBuffer}|null>(null);
  const setEnabled=useCallback(async(next:boolean)=>{
    try{
      if(!audio.current&&next){
        const Audio=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
        const context=new Audio(),master=context.createGain();master.gain.value=0;master.connect(context.destination);
        const swells:GainNode[]=[];
        for(let layer=0;layer<3;layer++){
          const buffer=context.createBuffer(1,context.sampleRate*12,context.sampleRate),data=buffer.getChannelData(0);
          let last=0;
          for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.045)/1.045;data[i]=last*4;}
          const edge=Math.floor(context.sampleRate*.08),join=(data[0]+data[data.length-1])/2;
          for(let i=0;i<edge;i++){const t=i/edge;data[i]=join*(1-t)+data[i]*t;const j=data.length-1-i;data[j]=join*(1-t)+data[j]*t;}
          const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
          const filter=context.createBiquadFilter();filter.type=layer===2?"bandpass":"lowpass";filter.frequency.value=layer===2?460:layer?2300:900;filter.Q.value=.42;
          const highpass=context.createBiquadFilter();highpass.type="highpass";highpass.frequency.value=80;
          const gain=context.createGain();gain.gain.value=.08;swells.push(gain);
          source.connect(filter);filter.connect(highpass);highpass.connect(gain);gain.connect(master);source.start(0,layer*3.7);
        }
        const impactNoise=context.createBuffer(1,Math.floor(context.sampleRate*.08),context.sampleRate);
        const noise=impactNoise.getChannelData(0);for(let i=0;i<noise.length;i++)noise[i]=(Math.random()*2-1)*Math.exp(-i/noise.length*9);
        const interval=setInterval(()=>swells.forEach((gain,i)=>{
          const swell=(Math.sin(context.currentTime*[.54,.38,.13][i]+i*2)+1)/2;
          gain.gain.setTargetAtTime(i===2 ? .035+swell*.06 : .06+Math.pow(swell,2)*.20,context.currentTime,.7);
        }),150);
        audio.current={context,master,interval,impactNoise};
      }
      if(audio.current){await audio.current.context.resume();audio.current.master.gain.setTargetAtTime(next&&!document.hidden ? .38 : 0,audio.current.context.currentTime,.5);}
      enabledRef.current=next;setEnabledState(next);setError("");
    }catch{setError("Sound is unavailable in this browser.");}
  },[]);
  const toggle=useCallback(()=>setEnabled(!enabledRef.current),[setEnabled]);

  const playImpact=useCallback((pieceType:string)=>{
    const sound=audio.current;if(!sound||!enabledRef.current||document.hidden||sound.context.state!=="running")return;
    const {context,master}=sound,feel=STONE_PIECE_FEEL[pieceType]||STONE_PIECE_FEEL.p;
    const now=context.currentTime,jitter=.97+Math.random()*.06,weight=Math.sqrt(feel.estimatedMassGrams/75);
    // Damped stone body, lower wooden resonance and a short grainy contact.
    for(const [frequency,level,duration] of [[feel.resonanceHz,.16,.13],[feel.resonanceHz*.51,.12,.20],[feel.resonanceHz*2.7,.022,.045]]){
      const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type="sine";
      oscillator.frequency.setValueAtTime(frequency*jitter,now);oscillator.frequency.exponentialRampToValueAtTime(frequency*.78*jitter,now+duration);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(level*weight*(.95+Math.random()*.1),now+.003);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      oscillator.connect(gain);gain.connect(master);oscillator.start(now);oscillator.stop(now+duration+.02);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    }
    const tick=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
    tick.buffer=sound.impactNoise;tick.playbackRate.value=jitter;filter.type="lowpass";filter.frequency.value=1800/weight;gain.gain.value=.11*weight;
    tick.connect(filter);filter.connect(gain);gain.connect(master);tick.start(now);tick.onended=()=>{tick.disconnect();filter.disconnect();gain.disconnect();};
  },[]);
  useEffect(()=>{
    const visibility=()=>{if(audio.current)audio.current.master.gain.setTargetAtTime(!document.hidden&&enabledRef.current ? .38 : 0,audio.current.context.currentTime,.2);};
    document.addEventListener("visibilitychange",visibility);
    return()=>{document.removeEventListener("visibilitychange",visibility);if(audio.current){clearInterval(audio.current.interval);void audio.current.context.close();audio.current=null;}};
  },[]);
  return {enabled,error,toggle,setEnabled,playImpact};
}
