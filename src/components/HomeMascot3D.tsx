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

  // نستنسخ الـ scene ونقوم بضبط الأبعاد والمركز تلقائياً لتفادي خروج الموديل عن نطاق الكاميرا
  const clonedScene = useState(() => {
    const s = scene.clone();
    
    // ضبط الخامات تلقائياً لتفادي البقع الداكنة أو الانعكاسات الزائدة برمجياً
    s.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.metalness = Math.min(mat.metalness || 0, 0.2);
          mat.roughness = Math.max(mat.roughness || 0.5, 0.6);
        }
      }
    });

    // حساب الحدود المحيطة بالموديل لتركيزه في المنتصف [0, 0, 0]
    const box = new THREE.Box3().setFromObject(s);
    const center = new THREE.Vector3();
    box.getCenter(center);
    s.position.sub(center);
    
    // قياس حجم الموديل لمواءمة مقياس الرسم (Scale) تلقائياً ليناسب إطار الكاميرا
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetScale = 1.8 / (maxDim || 1);
    s.scale.setScalar(targetScale);
    
    return s;
  })[0];

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
          <ambientLight intensity={2.2} />
          <directionalLight position={[4, 5, 4]} intensity={2.8} />
          <directionalLight position={[-4, 3, 2]} intensity={1.6} />
          <directionalLight position={[0, -3, 3]} intensity={0.8} />
          <pointLight position={[0, 1.5, 3.5]} intensity={2.2} color="#FFFFFF" />
          <AnimatedMascot />
        </Canvas>
      </Suspense>
    </div>
  );
}

// يحمّل الموديل مبكرًا في الخلفية بمجرد ما الكومبوننت ده يتحمّل (تحسين بسيط للسرعة المدركة)
useGLTF.preload("/models/chat.glb");
