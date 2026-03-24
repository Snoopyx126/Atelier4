import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Collection from "@/components/Collection";
import CustomLenses from "@/components/CustomLenses";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <Collection />
      <CustomLenses />
      <About />
      <Contact />
      <Footer />
    </div>
  );
};

export default Index;
