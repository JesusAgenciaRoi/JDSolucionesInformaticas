import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { Marquee } from '../components/Marquee';
import { Services } from '../components/Services';
import { Work } from '../components/Work';
import { Process } from '../components/Process';
import { Contact } from '../components/Contact';
import { useReveal } from '../lib/useReveal';

export default function Home() {
  const { hash } = useLocation();
  useReveal();
  useEffect(() => {
    document.title = 'JD Soluciones Informáticas · Software a medida en Uruguay';
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <>
      <Hero />
      <Marquee />
      <Services />
      <Work />
      <Process />
      <Contact />
    </>
  );
}
