"use client";
import { useEffect, useRef } from 'react';
import type { StudyEnvironment } from '@/lib/environments/registry';

// One small image, no event videos, network fetches or extra rendering context.
// Schedule uses visible, unpaused scene time so returning to a tab never jumps.
export function AmbientEvent({environment,paused,active=true}:{environment:StudyEnvironment;paused:boolean;active?:boolean}) {
  const boat=useRef<HTMLImageElement>(null),pause=useRef(paused||!active);pause.current=paused||!active;
  useEffect(()=>{
    const event=environment.ambientEvent;if(!event||!boat.current)return;
    const image=boat.current;
    let frame=0,last=performance.now(),elapsed=0;
    let reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion=()=>{reduced=media.matches;if(reduced)image.style.opacity='0';};media.addEventListener('change',onMotion);
    const render=(now:number)=>{
      frame=requestAnimationFrame(render);const dt=Math.min((now-last)/1000,.1);last=now;
      if(document.hidden||pause.current||reduced)return;
      elapsed+=dt;
      const progress=(elapsed%event.intervalSeconds-event.delaySeconds)/event.durationSeconds;
      if(progress<0||progress>1){image.style.opacity='0';return;}
      const width=window.innerWidth,height=window.innerHeight,aspect=width/height;
      const imageWidth=Math.max(width,height*environment.imageAspect),imageHeight=imageWidth/environment.imageAspect;
      const focalX=aspect<1?.42:.5;
      const x=(.64+progress*.27-focalX)*imageWidth+width/2;
      const waterline=(.412-.5)*imageHeight+height/2;
      image.style.width=`${Math.max(26,imageWidth*.04)}px`;
      image.style.left=`${x}px`;image.style.top=`${waterline}px`;
      image.style.transform=`translate(-50%,-100%) translateY(${Math.sin(progress*Math.PI*12)*.45}px)`;
      image.style.opacity=String(Math.min(progress*12,(1-progress)*12,1)*.68);
    };frame=requestAnimationFrame(render);
    return()=>{cancelAnimationFrame(frame);media.removeEventListener('change',onMotion);};
  },[environment]);
  return environment.ambientEvent?<img ref={boat} className="ambient-event" src={environment.ambientEvent.image} alt="" aria-hidden="true"/>:null;
}
