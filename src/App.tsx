import { useEffect, useRef, useState } from 'react';
import PdfBox from './PdfBox';
import Popup from './Popup';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Upload from './Upload';
// import { Document, Page } from 'react-pdf';

// import { pdfjs } from 'react-pdf';
// import { PDFDocumentProxy } from 'pdfjs-dist';
// import 'react-pdf/dist/Page/AnnotationLayer.css';
// import 'react-pdf/dist/Page/TextLayer.css';
// import './App.css';
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.mjs',
//   import.meta.url,
// ).toString();
// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
interface Viewer{
  hasUploaded: React.Dispatch<React.SetStateAction<Boolean>>;
};
interface Path {
  url: string;
  name: string;
};


function App() {
  let [invert, setInvert] = useState(0);
  let [hasUploaded, setHasUploaded] = useState<Boolean>(false);
  let [pdfPath, setPdfPath] = useState<File>();
  let [paths, setPaths] = useState<Array<Path>>([]);

  const Viewer: React.FC<Viewer> = ({hasUploaded})=> <>
    <div className='dark:bg-zinc-800'>
      <button className="inline-block bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100" onClick={()=>hasUploaded(false)}>&times;</button>
    </div>
    <PdfBox pdfPath={pdfPath} />
  </>
  return (
    <div className='App'>
      {!hasUploaded && <Upload hasUploaded={setHasUploaded} setFilePath={setPdfPath} paths={paths} setPaths={setPaths}/>}
      {hasUploaded && <Viewer hasUploaded={setHasUploaded}/>}
    </div>
  );
}

export default App;
