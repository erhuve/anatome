import { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Microscope, Minus, Plus, RotateCcw, ExternalLink } from 'lucide-react';
import { histologySlides } from '../histology';

type Props = { onPractice?: () => void };

export default function HistologyLab({ onPractice }: Props) {
  const [slideId, setSlideId] = useState(histologySlides[0].id);
  const [revealed, setRevealed] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [failedImage, setFailedImage] = useState(false);
  const slide = histologySlides.find(item => item.id === slideId) ?? histologySlides[0];
  const slideNumber = histologySlides.findIndex(item => item.id === slide.id) + 1;

  function selectSlide(id: string) {
    setSlideId(id);
    setZoom(1);
    setFailedImage(false);
  }

  return <section className="histology-lab" aria-label="Histology study laboratory">
    <style>{`
      .histology-lab { --histology-ink:#283b33; --histology-sage:#3b5c4a; --histology-line:#dedfd5; color:var(--histology-ink); }
      .histology-lab * { box-sizing:border-box; }
      .histology-header { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:24px; }
      .histology-eyebrow { color:#698171; font-size:10px; font-weight:700; letter-spacing:1.7px; text-transform:uppercase; margin:0 0 8px; }
      .histology-header h2 { font-family:Georgia,serif; font-weight:400; font-size:34px; line-height:1.2; letter-spacing:-1px; margin:0 0 8px; }
      .histology-header p { margin:0; font-size:13px; line-height:1.65; color:#7b8278; }
      .histology-reveal { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:11px 15px; border:1px solid #cdd5c9; border-radius:6px; background:#f5f6ee; color:var(--histology-sage); font-family:inherit; font-size:12px; cursor:pointer; white-space:nowrap; }
      .histology-grid { display:grid; grid-template-columns:210px minmax(0,1fr) 235px; min-height:480px; border:1px solid var(--histology-line); border-radius:9px; background:#fbfaf6; overflow:hidden; }
      .histology-sidebar { padding:19px 12px; background:#f6f5f0; border-right:1px solid var(--histology-line); }
      .histology-section-label { margin:0 7px 17px; display:flex; align-items:center; gap:7px; color:#737f70; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.4px; }
      .histology-slide-button { display:flex; align-items:center; gap:9px; width:100%; padding:12px 9px; margin-bottom:5px; border:1px solid transparent; border-radius:6px; background:transparent; text-align:left; color:#657060; cursor:pointer; font:inherit; }
      .histology-slide-button:hover { background:#eaf0e5; }
      .histology-slide-button[aria-pressed=true] { border-color:#d4dfce; background:#e5ecdf; color:#2c513b; }
      .histology-slide-button img { width:35px; height:35px; border-radius:50%; object-fit:cover; }
      .histology-slide-name { display:block; font-size:12px; line-height:1.45; font-weight:600; }
      .histology-slide-family { display:block; margin-top:3px; font-size:10px; color:#7e8979; }
      .histology-viewer { min-width:0; display:flex; flex-direction:column; }
      .histology-viewer-top { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:17px 19px; border-bottom:1px solid var(--histology-line); font-size:11px; }
      .histology-specimen-tag { color:#63765f; letter-spacing:1px; font-size:10px; text-transform:uppercase; }
      .histology-optical { color:#8a8e82; font-size:10px; }
      .histology-image-stage { display:block; flex:1; position:relative; min-height:300px; max-height:490px; overflow:auto; background:#1f2423; }
      .histology-micrograph { display:block; width:100%; min-height:100%; max-width:none; height:auto; object-fit:contain; }
      .histology-image-failure { min-height:300px; display:grid; place-content:center; text-align:center; padding:25px; color:#edf2e8; font-size:13px; }
      .histology-image-failure a { color:#d3dfbb; margin-top:12px; }
      .histology-tools { display:flex; align-items:center; justify-content:space-between; padding:11px 16px; border-top:1px solid var(--histology-line); gap:10px; }
      .histology-zoom { display:flex; align-items:center; gap:9px; color:#70806a; font-size:11px; }
      .histology-tool { display:grid; place-items:center; width:27px; height:27px; border:1px solid #dfe1d7; border-radius:4px; color:#64765d; background:#fffefa; cursor:pointer; }
      .histology-tool:disabled { opacity:.4; cursor:default; }
      .histology-zoom-help { font-size:10px; color:#8b9086; }
      .histology-caption { padding:13px 17px; color:#8b8f82; font-size:10px; line-height:1.65; border-top:1px solid #e7e7df; }
      .histology-caption a { color:#627c5d; text-decoration:underline; text-underline-offset:2px; }
      .histology-details { padding:23px 19px; border-left:1px solid var(--histology-line); }
      .histology-details h3 { font-family:Georgia,serif; font-weight:400; font-size:25px; line-height:1.25; margin:10px 0 9px; letter-spacing:-.6px; }
      .histology-family { display:inline-block; padding:5px 8px; background:#e9eddf; color:#6c7c5e; font-size:10px; border-radius:3px; }
      .histology-feature-title { margin:25px 0 14px; text-transform:uppercase; font-size:9px; letter-spacing:1.5px; color:#8b907f; }
      .histology-features { list-style:none; padding:0; margin:0; }
      .histology-features li { display:flex; gap:9px; font-size:11px; line-height:1.75; color:#6c7666; padding-bottom:13px; }
      .histology-features svg { flex-shrink:0; margin-top:4px; color:#879a78; }
      .histology-location { border-top:1px solid #e4e5dc; padding-top:13px; color:#8b9083; font-size:10px; line-height:1.7; }
      .histology-hidden { padding:15px 0; color:#7a8472; font-size:12px; line-height:1.9; }
      .histology-practice { display:flex; align-items:center; justify-content:space-between; gap:9px; width:100%; margin-top:22px; padding:12px 13px; color:#fff; background:#3d5c45; border:0; border-radius:5px; font-family:inherit; font-size:11px; cursor:pointer; }
      .histology-study-tip { margin:15px 0 0; color:#929687; font-size:10px; line-height:1.75; }
      .histology-lab button:focus-visible,.histology-lab a:focus-visible { outline:2px solid #618565; outline-offset:3px; }
      @media (max-width:1100px) { .histology-grid { grid-template-columns:180px minmax(0,1fr); } .histology-details { grid-column:1/-1; border-left:0; border-top:1px solid var(--histology-line); } .histology-features { display:flex; gap:20px; } .histology-features li { flex:1; } .histology-details h3 { font-size:24px; } .histology-details { padding:20px; } .histology-feature-title { margin-top:16px; } .histology-practice { width:auto; } }
      @media (max-width:640px) { .histology-header { align-items:flex-start; } .histology-header h2 { font-size:28px; } .histology-reveal { padding:9px; font-size:10px; } .histology-grid { display:flex; flex-direction:column; } .histology-sidebar { border-right:0; border-bottom:1px solid var(--histology-line); display:flex; gap:6px; padding:10px; overflow:auto; } .histology-section-label { display:none; } .histology-slide-button { min-width:140px; padding:8px; margin:0; } .histology-slide-button img { width:28px; height:28px; } .histology-slide-name { font-size:10px; } .histology-slide-family { font-size:9px; } .histology-features { display:block; } .histology-image-stage { min-height:210px; } .histology-optical { max-width:150px; text-align:right; } .histology-zoom-help { max-width:135px; text-align:right; } }
    `}</style>

    <header className="histology-header">
      <div>
        <div className="histology-eyebrow">The tissue laboratory</div>
        <h2>Look closer. See the pattern.</h2>
        <p>Real tissue micrographs. Learn the features that tell tissues apart.</p>
      </div>
      <button className="histology-reveal" onClick={() => setRevealed(!revealed)} aria-pressed={revealed}>
        {revealed ? <EyeOff size={14}/> : <Eye size={14}/>}
        {revealed ? 'Hide identity' : 'Reveal identity'}
      </button>
    </header>

    <div className="histology-grid">
      <nav className="histology-sidebar" aria-label="Histology specimens">
        <p className="histology-section-label"><Microscope size={13}/> {histologySlides.length} specimens</p>
        {histologySlides.map((item, index) => <button className="histology-slide-button" key={item.id} onClick={() => selectSlide(item.id)} aria-pressed={slide.id === item.id}>
          <img src={item.image} alt="" loading="lazy"/>
          <span><span className="histology-slide-name">{revealed ? item.name : `Specimen ${String(index + 1).padStart(2, '0')}`}</span>
          <span className="histology-slide-family">{revealed ? item.tissue : 'Identify the tissue'}</span></span>
        </button>)}
      </nav>

      <div className="histology-viewer">
        <div className="histology-viewer-top">
          <span className="histology-specimen-tag">Specimen {String(slideNumber).padStart(2, '0')}</span>
          {slide.magnification && <span className="histology-optical">Source magnification {slide.magnification}</span>}
        </div>
        <div className="histology-image-stage" key={slide.id} tabIndex={0} aria-label="Micrograph viewer; scroll to pan when zoomed">
          {failedImage ? <div className="histology-image-failure">This micrograph could not load.<a href={slide.source} target="_blank" rel="noreferrer">Open original source</a></div> :
            <img className="histology-micrograph" src={slide.image} alt={revealed ? `${slide.name}, histology photograph` : `Unlabeled histology specimen ${slideNumber}`} style={{width: `${zoom * 100}%`}} onError={() => setFailedImage(true)}/>}
        </div>
        <div className="histology-tools">
          <div className="histology-zoom">
            <button className="histology-tool" onClick={() => setZoom(Math.max(1, zoom - .25))} disabled={zoom <= 1} aria-label="Zoom out"><Minus size={13}/></button>
            <span>{zoom.toFixed(2).replace(/\.00$/, '')}× digital</span>
            <button className="histology-tool" onClick={() => setZoom(Math.min(2.5, zoom + .25))} disabled={zoom >= 2.5} aria-label="Zoom in"><Plus size={13}/></button>
            <button className="histology-tool" onClick={() => setZoom(1)} aria-label="Reset zoom"><RotateCcw size={12}/></button>
          </div>
          <span className="histology-zoom-help">Zoom to inspect · Scroll to pan</span>
        </div>
        <div className="histology-caption">
          {slide.credit} · <a href={slide.licenseUrl} target="_blank" rel="noreferrer">{slide.license}</a> · Wikimedia thumbnail, resized from original.<br/>
          <a href={slide.source} target="_blank" rel="noreferrer">Original micrograph & source record <ExternalLink size={9}/></a>
        </div>
      </div>

      <aside className="histology-details" aria-live="polite">
        <p className="histology-eyebrow">Specimen notes</p>
        {revealed ? <>
          <h3>{slide.name}</h3>
          <span className="histology-family">{slide.tissue}</span>
          <h4 className="histology-feature-title">Look for these features</h4>
          <ul className="histology-features">{slide.features.map(feature => <li key={feature}><Check size={12}/><span>{feature}</span></li>)}</ul>
          <p className="histology-location">{slide.location}</p>
        </> : <>
          <h3>What do you see?</h3>
          <p className="histology-hidden">Before revealing the identity, describe the cell shapes, arrangement, nuclei, and extracellular material. Name two features that support your identification.</p>
          <button className="histology-reveal" onClick={() => setRevealed(true)}><Eye size={13}/> Check your identification</button>
        </>}
        {onPractice && <button className="histology-practice" onClick={onPractice}>Practice tissue identification <ArrowRight size={14}/></button>}
        <p className="histology-study-tip">Compare specimens, then hide their identities and retrieve the distinguishing features from memory.</p>
      </aside>
    </div>
  </section>;
}
