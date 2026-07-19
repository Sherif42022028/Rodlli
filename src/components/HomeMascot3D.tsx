// components/HomeMascot3D.tsx
// كومبوننت كامل لعرض ماسكوت الشات بوت (chat.glb) بحركة تلقائية في صفحة الـ Home
// الاستخدام: استورده بـ dynamic import (ssr: false) من صفحة الـ Home مباشرة

"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ============================================================
// 1. الموديل نفسه + منطق الحركة
// ============================================================

function AnimatedMascot() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/chat.glb");

  // نستنسخ الـ scene عشان لو الكومبوننت اتعمله remount، مايحصلش تعارض
  const clonedScene = useState(() => scene.clone())[0];

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // حركة "تنفس" بسيطة لأعلى وأسفل — بتخلي الماسكوت يبان "حي" حتى وهو واقف
    groupRef.current.position.y = Math.sin(t * 1.1) * 0.06;

    // ميل خفيف مستمر يمين/شمال — إحساس طبيعي، مش آلي
    groupRef.current.rotation.z = Math.sin(t * 0.7) * 0.04;

    // كل 6 ثواني تقريبًا، يعمل "إشارة" أوضح ناحية الأزرار (ميل أكبر لثانية ونص)
    const cycle = t % 6;
    if (cycle > 3 && cycle < 4.5) {
      const progress = (cycle - 3) / 1.5; // من 0 لـ 1
      const pointAngle = Math.sin(progress * Math.PI) * 0.25; // بيروح ويرجع
      groupRef.current.rotation.y = -0.15 + pointAngle;
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        -0.15,
        0.05
      );
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ============================================================
// 2. فولباك بسيط وقت التحميل (دائرة نبض بلون البراند)
// ============================================================

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-16 h-16 rounded-full bg-orange-500/20 animate-pulse" />
    </div>
  );
}

// ============================================================
// 3. الكومبوننت الرئيسي — ده اللي هتستورده في صفحة الـ Home
// ============================================================

export default function HomeMascot3D() {
  return (
    <div className="relative w-full max-w-[220px] sm:max-w-[280px] aspect-[1/1.86] mx-auto lg:mx-0">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0, 3.5], fov: 40 }}
          dpr={[1, 2]} // يحافظ على وضوح الموديل على شاشات retina من غير ما يبالغ في الأداء
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 3]} intensity={1.1} />
          <directionalLight position={[-3, 2, -2]} intensity={0.3} />
          <AnimatedMascot />
        </Canvas>
      </Suspense>
    </div>
  );
}

// يحمّل الموديل مبكرًا في الخلفية بمجرد ما الكومبوننت ده يتحمّل (تحسين بسيط للسرعة المدركة)
useGLTF.preload("/models/chat.glb");
