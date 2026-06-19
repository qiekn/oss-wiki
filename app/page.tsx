export default function Home() {
  return (
    /* 
      Let me explain those class names:
      - min-h-screen: at least viewport height (you can remove this to see the different, try it!)
      - bg-naysayer: best known from Jonathan Blow's compiler livestreams
      - flex, items-center, justify-center: enable Flexbox layout and vertically + horizontally center
    */
    <main className="min-h-screen bg-naysayer text-white flex items-center justify-center">
      <h1 className="text-4xl">Order of the Sinking Star</h1>
    </main>
  );
}
