import './App.css'

function App() {
  return (
    <main className="wallpaper-shell">
      <img className="wallpaper-sample" src="./wallpapers/1.jpg" alt="" />
      <section className="package-note" aria-labelledby="app-title">
        <p className="eyebrow">A space for your images</p>
        <h1 id="app-title">Slideshow Studio</h1>
        <p>Local wallpaper package</p>
        <p className="package-status">Static sample · Playback and settings coming in subsequent batches.</p>
      </section>
    </main>
  )
}

export default App
