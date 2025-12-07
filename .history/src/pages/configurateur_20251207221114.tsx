import React, { useState, Suspense } from 'react';
import Navigation from "@/components/Navigation";
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Text, Float, Environment } from '@react-three/drei';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
// ✅ CORRECTION 1 : Remplacement de RotateNc par RotateCw
import { Palette, Gem, Type, Shapes, RotateCw } from "lucide-react";

// --- COMPOSANT 3D : LE VERRE DE LUNETTE ---
const Lens3D = ({ shape, color, diamondCut, engraving }: any) => {
  const glassMaterialProps = {
    transmission: 1, 
    thickness: 1.5,  
    roughness: 0,    
    envMapIntensity: 1.5, 
    clearcoat: 1,    
    clearcoatRoughness: 0,
    color: color,    
    attenuationDistance: 0.5,
    attenuationColor: color
  };

  let geometryArgs: [number, number, number, number] = [1.5, 1.5, 0.2, 64]; 
  
  if (shape === 'carre') geometryArgs = [1.5, 1.5, 0.2, 4]; 
  if (shape === 'hexagonal') geometryArgs = [1.5, 1.5, 0.2, 6]; 
  
  if (diamondCut) {
      if (shape === 'rond') geometryArgs = [1.5, 1.5, 0.2, 12]; 
  }

  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={geometryArgs} />
          <meshPhysicalMaterial {...glassMaterialProps} />
        </mesh>

        {diamondCut && (
           <mesh rotation={[Math.PI / 2, 0, 0]}>
             <cylinderGeometry args={[1.51, 1.51, 0.15, shape === 'rond' ? 12 : (shape === 'carre' ? 4 : 6)]} />
             <meshStandardMaterial color="white" metalness={1} roughness={0} emissive="white" emissiveIntensity={0.2} />
           </mesh>
        )}

        {engraving && (
          <Text
            position={[0, 0, 0.11]} 
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
          >
            {engraving}
          </Text>
        )}
      </Float>
    </group>
  );
};

// --- PAGE PRINCIPALE ---
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
        <div className="w-full lg:w-2/3 h-[50vh] lg:h-full bg-gradient-to-br from-gray-100 to-gray-300 relative cursor-move">
            
            <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
                <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.5}>
                        <Lens3D shape={shape} color={tint} diamondCut={diamondCut} engraving={engraving} />
                    </Stage>
                    <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
                    <Environment preset="warehouse" /> 
                </Suspense>
            </Canvas>

            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm text-sm font-bold flex items-center gap-2">
                {/* ✅ CORRECTION 1 : Utilisation de RotateCw */}
                <RotateCw className="w-4 h-4" /> Vue 360° Interactive
            </div>
        </div>

        {/* PANNEAU DE CONTRÔLE */}
        <div className="w-full lg:w-1/3 bg-white border-l border-gray-200 p-6 overflow-y-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-playfair font-bold text-gray-900">Atelier Sur-Mesure</h1>
                <p className="text-gray-500 text-sm">Créez votre verre unique en temps réel.</p>
            </div>

            <Tabs defaultValue="forme" className="space-y-6">
                <TabsList className="grid grid-cols-4 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger value="forme"><Shapes className="w-4 h-4" /></TabsTrigger>
                    <TabsTrigger value="couleur"><Palette className="w-4 h-4" /></TabsTrigger>
                    <TabsTrigger value="finition"><Gem className="w-4 h-4" /></TabsTrigger>
                    <TabsTrigger value="gravure"><Type className="w-4 h-4" /></TabsTrigger>
                </TabsList>

                {/* 1. FORME */}
                <TabsContent value="forme" className="space-y-4">
                    <h3 className="font-bold text-lg">Choisissez la forme</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {/* ✅ CORRECTION 2 : Remplacement de 'default' par 'primary' */}
                        <Button 
                            variant={shape === 'rond' ? 'primary' : 'outline'} 
                            onClick={() => setShape('rond')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <div className="w-8 h-8 rounded-full border-2 border-current"></div>
                            Ronde
                        </Button>
                        <Button 
                            variant={shape === 'carre' ? 'primary' : 'outline'} 
                            onClick={() => setShape('carre')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <div className="w-8 h-8 border-2 border-current"></div>
                            Carrée
                        </Button>
                        <Button 
                            variant={shape === 'hexagonal' ? 'primary' : 'outline'} 
                            onClick={() => setShape('hexagonal')}
                            className="h-20 flex flex-col gap-2"
                        >
                            <div className="w-8 h-8 border-2 border-current transform rotate-45"></div>
                            Hexa
                        </Button>
                    </div>
                </TabsContent>

                {/* 2. COULEUR */}
                <TabsContent value="couleur" className="space-y-4">
                    <h3 className="font-bold text-lg">Teinte du verre</h3>
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { name: 'Bleu', code: '#aaddff' },
                            { name: 'Rose', code: '#ffcce6' },
                            { name: 'Vert', code: '#ccffcc' },
                            { name: 'Jaune', code: '#ffffcc' },
                            { name: 'Gris', code: '#aaaaaa' },
                            { name: 'Violet', code: '#e6ccff' },
                            { name: 'Bronze', code: '#cd7f32' },
                            { name: 'Clair', code: '#ffffff' },
                        ].map((c) => (
                            <button
                                key={c.name}
                                onClick={() => setTint(c.code)}
                                className={`w-12 h-12 rounded-full border-2 transition-transform hover:scale-110 ${tint === c.code ? 'border-black scale-110 shadow-md' : 'border-gray-200'}`}
                                style={{ backgroundColor: c.code }}
                                title={c.name}
                            />
                        ))}
                    </div>
                    
                    <div className="pt-4">
                        <Label>Opacité / Intensité (Simulation)</Label>
                        <Slider defaultValue={[50]} max={100} step={1} className="mt-2" />
                    </div>
                </TabsContent>

                {/* 3. FINITION */}
                <TabsContent value="finition" className="space-y-4">
                    <h3 className="font-bold text-lg">Finition des bords</h3>
                    <Card 
                        className={`cursor-pointer transition-all border-2 ${!diamondCut ? 'border-black bg-gray-50' : 'border-gray-200'}`}
                        onClick={() => setDiamondCut(false)}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                            <div>
                                <p className="font-bold">Bord Poli Standard</p>
                                <p className="text-xs text-gray-500">Lisse et transparent classique.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card 
                        className={`cursor-pointer transition-all border-2 ${diamondCut ? 'border-black bg-blue-50' : 'border-gray-200'}`}
                        onClick={() => setDiamondCut(true)}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <Gem className="w-10 h-10 text-blue-500" />
                            <div>
                                <p className="font-bold">Diamond Cut</p>
                                <p className="text-xs text-gray-500">Facettes taillées façon diamant pour un éclat unique.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 4. GRAVURE */}
                <TabsContent value="gravure" className="space-y-4">
                    <h3 className="font-bold text-lg">Personnalisation</h3>
                    <div className="space-y-2">
                        <Label>Texte à graver (Max 8 car.)</Label>
                        <Input 
                            placeholder="Initiales..." 
                            maxLength={8}
                            value={engraving} 
                            onChange={(e) => setEngraving(e.target.value)} 
                        />
                        <p className="text-xs text-gray-400">La gravure apparaîtra au centre du verre pour la démo.</p>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="mt-10 border-t pt-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Configuration :</span>
                    <span className="font-bold capitalize">{shape} / {diamondCut ? 'Diamond' : 'Std'}</span>
                </div>
                <Button className="w-full bg-black text-white h-12 text-lg hover:bg-gray-800">
                    Valider cette création
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Configurateur;