"use client";

import { useEffect, useRef, useState } from "react";
import type { StudyEnvironment } from "@/lib/environments/registry";

// A spatially masked shader moves the photographed water and leaves continuously.
// It never moves the chessboard, UI, horizon, or the entire photograph.
export function Environment({ environment, paused }: { environment: StudyEnvironment; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [software, setSoftware] = useState(false);
  const waterAnimation = useRef<SVGSVGElement>(null);
  const pauseRef = useRef(paused);
  pauseRef.current = paused;
  useEffect(() => {
    let dispose = () => {};
    let cancelled = false;
    import("three").then(THREE => {
      if (cancelled || !host.current) return;
      const el = host.current;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" }); }
      catch { setSoftware(true); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.domElement.setAttribute("aria-hidden", "true");
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const texture = new THREE.TextureLoader().load(environment.image);
      const uniforms = { image: { value: texture }, time: { value: 0 }, aspect: { value: 1 }, imageAspect: { value: environment.imageAspect } };
      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.);}`,
        fragmentShader: `
          uniform sampler2D image; uniform float time; uniform float aspect; uniform float imageAspect;
          varying vec2 vUv;
          void main(){
            vec2 uv=vUv;
            if(aspect>imageAspect) uv.y=(uv.y-.5)*imageAspect/aspect+.5;
            else uv.x=(uv.x-.5)*aspect/imageAspect+(aspect<1.?.42:.5);
            float y=1.-uv.y;
            float shore=.52+.13*uv.x;
            float water=smoothstep(.372,.401,y)*(1.-smoothstep(shore-.024,shore+.012,y))*smoothstep(.39,.44,uv.x);
            float depth=smoothstep(.37,.65,y);
            float w=sin(y*170.-time*.66+sin(uv.x*17.+time*.23)*1.5);
            uv.x+=water*(sin(y*93.+time*.42)*.0015+sin(uv.x*31.+time*.17)*.0005)*depth;
            uv.y+=water*(w*.00165+sin(y*340.-time*.43)*.00035)*depth;
            float leaf=(1.-smoothstep(.08,.36,y))*smoothstep(.23,.38,uv.x)*(1.-smoothstep(.62,.74,uv.x));
            leaf+=smoothstep(.76,.9,uv.x)*(1.-smoothstep(.14,.30,y));
            uv.x+=leaf*sin(time*.27+uv.y*7.)*.00125;
            uv.y+=leaf*sin(time*.31+uv.x*12.)*.00065;
            vec3 c=texture2D(image,uv).rgb;
            float shimmer=water*depth*(sin(uv.x*150.+y*80.+time*.48)*sin(y*310.-time*.55))*.012;
            c+=vec3(shimmer*.72,shimmer*.9,shimmer);
            gl_FragColor=vec4(c,1.);
          }`,
      });
      const geometry = new THREE.PlaneGeometry(2, 2);
      scene.add(new THREE.Mesh(geometry, material));
      const resize = () => {
        renderer.setSize(el.clientWidth, el.clientHeight);
        uniforms.aspect.value = el.clientWidth / Math.max(1, el.clientHeight);
        renderer.render(scene, camera);
      };
      const observer = new ResizeObserver(resize); observer.observe(el); resize();
      let frame = 0, last = performance.now(), accumulated = 0;
      const render = (now: number) => {
        frame = requestAnimationFrame(render);
        const elapsed = Math.min((now - last) / 1000, .1); last = now;
        if (document.hidden) return;
        accumulated += elapsed;
        if (accumulated < 1 / 30) return;
        if (!pauseRef.current && environment.animation !== "still") uniforms.time.value += accumulated;
        accumulated = 0;
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(render);
      dispose = () => { cancelAnimationFrame(frame); observer.disconnect(); texture.dispose(); geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove(); };
    }).catch(() => setSoftware(true));
    return () => { cancelled = true; dispose(); };
  }, [environment]);
  useEffect(() => {
    if (!waterAnimation.current) return;
    if (paused) waterAnimation.current.pauseAnimations(); else waterAnimation.current.unpauseAnimations();
  }, [paused, software]);
  return <div className="environment" aria-hidden="true" style={{ backgroundImage: `url(${environment.image})` }} ref={host}>
    {software&&<svg ref={waterAnimation} className="software-environment" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <clipPath id="water-region"><path d="M720 355 L1620 355 L1530 568 L1380 556 L1130 534 L910 512 L730 479 Z"/></clipPath>
        <clipPath id="fronds-region"><path d="M610 0H1160V175L1025 120L950 300L900 100L710 310L705 160L610 280Z M1450 0H1672V305L1585 180L1490 320L1540 115Z"/></clipPath>
        <filter id="water-ripple" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.073" numOctaves="2" seed="4" result="ripple"><animate attributeName="baseFrequency" values="0.012 0.073;0.013 0.085;0.014 0.076;0.012 0.073" dur="21s" repeatCount="indefinite"/></feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="ripple" scale="6" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="leaf-breeze" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.014" numOctaves="1" seed="8" result="breeze"><animate attributeName="baseFrequency" values="0.004 0.014;0.005 0.012;0.004 0.014" dur="17s" repeatCount="indefinite"/></feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="breeze" scale="4" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      <image href={environment.image} width="1672" height="941"/>
      <g clipPath="url(#water-region)"><image href={environment.image} width="1672" height="941" filter="url(#water-ripple)"/></g>
      <g clipPath="url(#fronds-region)"><image href={environment.image} width="1672" height="941" filter="url(#leaf-breeze)"/></g>
    </svg>}
  </div>;
}
