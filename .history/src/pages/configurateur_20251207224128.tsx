import React, { useState, Suspense, useMemo } from 'react';
import Navigation from "@/components/Navigation";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Text, Float, Environment, PivotControls, Center } from '@react-three/drei';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Palette, Gem, Type, Shapes, RotateCw, Move, Check, Sparkles } from "lucide-react";
import * as THREE from 'three';
import { parseOMA, CARTIER_OMA } from "@/lib/omaParser";

// --- 1. DESSIN DES FORMES ---
const getLensShape = (type: string) => {
  const shape = new THREE.Shape();

  if (type === 'rond') {
    shape.absarc(0, 0, 1.8, 0, Math.PI * 2, false); 
  } 
  else if (type === 'carre') {
    const w = 1.8; const h = 1.6; const r = 0.6;
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
    const s = 1.9;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      shape[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(angle) * s, Math.sin(angle) * s);
    }
    shape.closePath();
  }
  else if (type === 'aviator') {
    shape.moveTo(-1.8, 1.2); 
    shape.lineTo(1.0, 1.2);  
    shape.bezierCurveTo(2.0, 1.2, 2.3, 0.4, 2.0, -0.5); 
    shape.bezierCurveTo(1.6, -1.8, 0.4, -2.2, -0.6, -2.0); 
    shape.bezierCurveTo(-2.0, -1.6, -2.3, 0.4, -1.8, 1.2); 
  }
  else if (type === 'cartier') {
    const omaShape = parseOMA(CARTIER_OMA);
    if (omaShape) return omaShape;
    shape.absarc(0, 0, 1.8, 0, Math.PI * 2, false);
  }

  return shape;
};

// --- 2. COMPOSANT 3D ---
const Lens3D = ({ shapeType, color, diamondMode, engraving }: any) => {
  
  // Configuration des Biseaux selon le mode Diamond Cut
  const geometrySettings = useMemo(() => {
    const shape = getLensShape(shapeType);
    
    // Par défaut (Standard)
    let bThickness = 0.05;
    let bSize = 0.05;
    let bSegments = 32; // Très lisse

    // Mode "Classic" (Facettes douces)
    if (diamondMode === 'classic') {
        bThickness = 0.3;
        bSize = 0.3;
        bSegments = 3; // Quelques facettes
    }
    // Mode "Crystal" (Facettes nettes style bijou)
    else if (diamondMode === 'crystal') {
        bThickness = 0.4;
        bSize = 0.4;
        bSegments = 1; // 1 seul segment = Arête très vive
    }

    return {
      depth: 0.05, 
      bevelEnabled: true, 
      bevelThickness: bThickness, 
      bevelSize: bSize,      
      bevelSegments: bSegments,
      curveSegments: 64 
    };
  }, [shapeType, diamondMode]);

  const shapeObject = useMemo(() => getLensShape(shapeType), [shapeType]);

  // ✅ MATÉRIAU "ANTI-REFLET"
  const glassMaterialProps = {
    transmission: 0.99, 
    thickness: 0.1,     
    roughness: 0.3,       // Un peu de grain pour casser le miroir
    envMapIntensity: 0.1, // Quasiment aucune réflexion de l'environnement (0.1)
    clearcoat: 0,         // Pas de vernis brillant
    color: color,
    attenuationTint: color,
    attenuationDistance: 2, // Couleur plus diffuse
    ior: 1.1              // Indice de réfraction faible (moins de distorsion)
  };

  return (
    <Center>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2} floatingRange={[-0.1, 0.1]}>
        <mesh position={[0, 0, 0]}>
          <extrudeGeometry args={[shapeObject, geometrySettings]} />
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
              position={[0, 0, diamondMode !== 'standard' ? 0.25 : 0.08]} 
              fontSize={0.25} 
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor={color}
              fillOpacity={0.9}
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
  // ✅ diamondMode remplace le boolean (standard, classic, crystal)
  const [diamondMode, setDiamondMode] = useState('standard'); 
  const [engraving, setEngraving] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      
      <div className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-80px)] pt-20">
        
        {/* ZONE 3D */}
        <div className="w-full lg:w-2/3 h-[50vh] lg:h-full bg-gradient-to-br from-gray-100 to-gray-300 relative">
            
            <Canvas shadows camera={{ position: [0, 0, 14], fov: 25 }}>
                <Suspense fallback={null}>
                    {/* Lumière studio très douce */}
                    <Stage environment="studio" intensity={0.2} adjustCamera={false}>
                        <Lens3D shapeType={shape} color={tint} diamondMode={diamondMode} engraving={engraving} />
                    </Stage>
                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI} />
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

                {/* ✅ FINITION : 3 STYLES DIFFÉRENTS */}
                <TabsContent value="finition" className="space-y-4">
                    <h3 className="font-bold text-sm uppercase text-gray-500">Façonnage des bords</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {/* STANDARD */}
                        <div 
                            className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${diamondMode === 'standard' ? 'border-black bg-gray-50 ring-1 ring-black' : 'border-gray-200'}`}
                            onClick={() => setDiamondMode('standard')}
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-200 border"></div>
                            <div><p className="font-bold text-sm">Bord Poli Glace</p><p className="text-xs text-gray-500">Finition lisse standard.</p></div>
                            {diamondMode === 'standard' && <Check className="w-4 h-4 ml-auto" />}
                        </div>

                        {/* CLASSIC */}
                        <div 
                            className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${diamondMode === 'classic' ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'border-gray-200'}`}
                            onClick={() => setDiamondMode('classic')}
                        >
                            <Gem className="w-8 h-8 text-blue-600" />
                            <div><p className="font-bold text-sm">Diamond Cut "Classic"</p><p className="text-xs text-gray-500">Facettes douces et multiples.</p></div>
                            {diamondMode === 'classic' && <Check className="w-4 h-4 ml-auto text-blue-600" />}
                        </div>

                        {/* CRYSTAL */}
                        <div 
                            className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 ${diamondMode === 'crystal' ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-gray-200'}`}
                            onClick={() => setDiamondMode('crystal')}
                        >
                            <Sparkles className="w-8 h-8 text-purple-600" />
                            <div><p className="font-bold text-sm">Diamond Cut "Crystal"</p><p className="text-xs text-gray-500">Arêtes vives, style bijou.</p></div>
                            {diamondMode === 'crystal' && <Check className="w-4 h-4 ml-auto text-purple-600" />}
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