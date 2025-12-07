import React, { useState, Suspense, useMemo } from 'react';
import Navigation from "@/components/Navigation";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Text, Float, Environment, PivotControls, Center } from '@react-three/drei';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Palette, Gem, Type, Shapes, RotateCw, Move, Check } from "lucide-react";
import * as THREE from 'three';

// ✅ IMPORT DU PARSEUR OMA
import { parseOMA, CARTIER_OMA } from "@/lib/omaParser";

// --- 1. DESSIN DES FORMES ---
const getLensShape = (type: string) => {
  const shape = new THREE.Shape();

  if (type === 'rond') {
    shape.absarc(0, 0, 2.2, 0, Math.PI * 2, false); 
  } 
  else if (type === 'carre') {
    const w = 2.2; const h = 2.0; const r = 0.5;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
  } 
  else if (type === 'hexagonal') {
    const s = 2.3;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      shape[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * s, Math.sin(angle) * s);
    }
    shape.closePath();
  }
  else if (type === 'aviator') {
    shape.moveTo(-2.0, 1.5); 
    shape.lineTo(1.0, 1.5);  
    shape.bezierCurveTo(2.2, 1.5, 2.5, 0.5, 2.2, -0.5); 
    shape.bezierCurveTo(1.8, -2.0, 0.5, -2.5, -0.5, -2.2); 
    shape.bezierCurveTo(-2.2, -1.8, -2.5, 0.5, -2.0, 1.5); 
  }
  else if (type === 'cartier') {
    const omaShape = parseOMA(CARTIER_OMA);
    if (omaShape) return omaShape;
    shape.absarc(0, 0, 2.2, 0, Math.PI * 2, false);
  }

  return shape;
};

// --- 2. COMPOSANT 3D (Reflets Atténués) ---
const Lens3D = ({ shapeType, color, diamondCut, engraving }: any) => {
  
  const geometrySettings = useMemo(() => {
    const shape = getLensShape(shapeType);
    return {
      depth: 0.05, 
      bevelEnabled: true, 
      bevelThickness: diamondCut ? 0.3 : 0.05, 
      bevelSize: diamondCut ? 0.3 : 0.05,      
      bevelSegments: diamondCut ? 1 : 32, 
      curveSegments: 64 
    };
  }, [shapeType, diamondCut]);

  const shapeObject = useMemo(() => getLensShape(shapeType), [shapeType]);

  // ✅ RÉGLAGES ANTI-REFLETS ICI
  const glassMaterialProps = {
    transmission: 0.99, // Très transparent
    thickness: 0.5,     
    roughness: 0.2,     // ✅ AUGMENTÉ : Rend le verre moins "miroir" (plus flou)
    envMapIntensity: 0.3, // ✅ BAISSÉ : Réduit la force des reflets de la ville
    clearcoat: 0,       // ✅ DÉSACTIVÉ : Enlève la couche de vernis brillant
    metalness: 0,       // Pas de métal
    color: color,
    attenuationTint: color,
    attenuationDistance: 1,
    ior: 1.5 
  };

  return (
    <Center>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2} floatingRange={[-0.1, 0.1]}>
        <mesh position={[0, 0, 0]}>
          <extrudeGeometry args={[shapeObject, geometrySettings]} />
          {/* On applique le matériau matifié */}
          <meshPhysicalMaterial {...glassMaterialProps} side={THREE.DoubleSide} />
        </mesh>

        {engraving && (
          <PivotControls 
            anchor={[0, 0, 0]} 
            depthTest={false} 
            activeAxes={[true, true, false]} 
            scale={0.5} 
            lineWidth={2}
            disableRotations
          >
            <Text
              position={[0, 0, diamondCut ? 0.25 : 0.1]} 
              fontSize={0.30} 
              color="white" // Texte blanc mat
              anchorX="center"
              anchorY="middle"
              fillOpacity={0.8} // Légèrement transparent pour faire "sablé"
            >
              {engraving}
            </Text>
          </PivotControls>
        )}
      </Float>
    </Center>
  );
};

// --- PAGE ---
const Configurateur = () => {
  const [shape, setShape] = useState('rond');
  const [tint, setTint] = useState('#aaddff'); 
  const [diamondCut, setDiamondCut] = useState(false);
  const [engraving, setEngraving] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-80px)] pt-20">
        
        {/* ZONE 3D */}
        <div className="w-full lg:w-2/3 h-[50vh] lg:h-full bg-gradient-to-br from-gray-100 to-gray-300 relative">
            
            <Canvas shadows camera={{ position: [0, 0, 14], fov: 25 }}>
                <Suspense fallback={null}>
                    {/* Environment Studio soft pour éviter les reflets durs */}
                    <Stage environment="studio" intensity={0.4} adjustCamera={false}>
                        <Lens3D shapeType={shape} color={tint} diamondCut={diamondCut} engraving={engraving} />
                    </Stage>
                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI} />
                    {/* Pas d'Environment preset ici pour éviter les reflets de ville */}
                </Suspense>
            </Canvas>

            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm text-xs font-bold text-gray-700 flex flex-col gap-1">
                <div className="flex items-center gap-2"><RotateCw className="w-3 h-3" /> 360° Interactif</div>
                {engraving && <div className="flex items-center gap-2 text-blue-600"><Move className="w-3 h-3" /> Déplacez le texte sur le verre</div>}
            </div>
        </div>

        {/* PANNEAU DE CONTRÔLE */}
        <div className="w-full lg:w-1/3 bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-playfair font-bold text-gray-900">Atelier Sur-Mesure</h1>
                <p className="text-gray-500 text-sm">Designez votre verre technique.</p>
            </div>

            <Tabs defaultValue="forme" className="space-y-6">
                <TabsList className="grid grid-cols-4 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="forme"><Shapes className="w-4 h-4" /></TabsTrigger>
                    <TabsTrigger value="couleur"><Palette className="w-4 h-4" /></TabsTrigger>
                    <TabsTrigger value="finition"><Gem className="w-4 h-4" /></TabsTrigger>
                    <TabsTrigger value="gravure"><Type className="w-4 h-4" /></TabsTrigger>
                </TabsList>

                <TabsContent value="forme" className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-gray-500">Forme du calibre</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Button className={shape === 'rond' ? 'bg-black text-white' : 'bg-white text-black border'} onClick={() => setShape('rond')}>Ronde</Button>
                        <Button className={shape === 'carre' ? 'bg-black text-white' : 'bg-white text-black border'} onClick={() => setShape('carre')}>Carrée</Button>
                        <Button className={shape === 'hexagonal' ? 'bg-black text-white' : 'bg-white text-black border'} onClick={() => setShape('hexagonal')}>Hexagonale</Button>
                        <Button className={shape === 'aviator' ? 'bg-black text-white' : 'bg-white text-black border'} onClick={() => setShape('aviator')}>Aviateur</Button>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-bold text-gray-400 mb-2">FORMES TECHNIQUES (OMA)</p>
                        <Button 
                            className={`w-full ${shape === 'cartier' ? 'bg-red-600 text-white' : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'}`}
                            onClick={() => setShape('cartier')}
                        >
                            Cartier 0284O (Officiel)
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="couleur" className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-gray-500">Teinte & Dégradé</h3>
                    <div className="grid grid-cols-5 gap-3">
                        {['#aaddff', '#ffcce6', '#ccffcc', '#ffffcc', '#aaaaaa', '#e6ccff', '#cd7f32', '#ffffff', '#1a1a1a', '#ff0000'].map((c) => (
                            <button
                                key={c}
                                onClick={() => setTint(c)}
                                className={`w-8 h-8 rounded-full border-2 transition-transform ${tint === c ? 'border-black scale-110 shadow-sm' : 'border-gray-200'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <div className="pt-4">
                        <Label>Intensité de la teinte</Label>
                        <Slider defaultValue={[50]} max={100} step={1} className="mt-2" />
                    </div>
                </TabsContent>

                <TabsContent value="finition" className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-gray-500">Façonnage des bords</h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div 
                            className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${!diamondCut ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200'}`}
                            onClick={() => setDiamondCut(false)}
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-300 to-white shadow-inner"></div>
                            <div><p className="font-bold text-sm">Bord Poli Glace</p><p className="text-xs text-gray-500">Finition lisse et transparente.</p></div>
                            {!diamondCut && <Check className="w-4 h-4 ml-auto" />}
                        </div>
                        <div 
                            className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${diamondCut ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200'}`}
                            onClick={() => setDiamondCut(true)}
                        >
                            <Gem className="w-8 h-8 text-blue-600" />
                            <div><p className="font-bold text-sm">Diamond Cut</p><p className="text-xs text-gray-500">Facettes taillées main.</p></div>
                            {diamondCut && <Check className="w-4 h-4 ml-auto text-blue-600" />}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="gravure" className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-gray-500">Gravure Laser</h3>
                    <div className="space-y-3">
                        <Label>Texte personnalisé</Label>
                        <Input 
                            placeholder="Initiales, Date..." 
                            maxLength={10}
                            value={engraving} 
                            onChange={(e) => setEngraving(e.target.value)} 
                        />
                        {engraving && (
                            <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 flex gap-2">
                                <Move className="w-4 h-4 shrink-0" />
                                <span>Déplacez le texte directement sur le verre !</span>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            <div className="mt-10 border-t pt-6">
                <Button className="w-full bg-black text-white h-12 text-lg hover:bg-gray-800 shadow-lg">
                    Valider ce design
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Configurateur;