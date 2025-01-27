import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { PDFDocumentProxy } from 'pdfjs-dist';
// import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PdfBox.css';
import ReactMarkdown from 'react-markdown';
import { useSwipeable } from "react-swipeable";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//     'pdfjs-dist/build/pdf.worker.min.mjs',
//     import.meta.url,
//   ).toString();
const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.min.mjs');
// pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js';

// let URLGPT = "https://localhost:8000";
let URLGPT = "https://smartbooks-sfgp.onrender.com";
interface PdfBoxProps {
  // pdfPath: string;
  pdfPath: File|undefined;
}

const PdfBox: React.FC<PdfBoxProps> = ({ pdfPath}) => {
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [extraPages, setExtraPages] = useState<number>(10);
  const targetRef: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  let [compressionratio, setCompressionratio] = useState<Number>(2);
  let [summary, setSummary] = useState<string>("");
  let [loading, setLoading] = useState(false);
  let [settings, setSettings] = useState<Boolean>(false);
  let [scale, setScale] = useState<number>(1);
  
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        console.log(pageNumber, numPages);
        if(pageNumber < numPages){
          console.log("geiw");
          setPageNumber(pageNumber+1);	
        }
      }
      else if(event.key === "ArrowLeft"){
        console.log("leftgeiw");
        if(pageNumber > 1)
          setPageNumber(pageNumber-1);	
      }
    };

    // Attach the event listener
    window.addEventListener("keydown", handleKey);
    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKey);
    };    
  }, [numPages, pageNumber]);

  const nextPage = ()=>{
    if(pageNumber < numPages) setPageNumber(pageNumber+1);
  };
  const prevPage = ()=>{
    if(pageNumber>1) setPageNumber(pageNumber-1);
  };

  // Add swipe handlers
  const handlers = useSwipeable({
    onSwipedLeft: nextPage,
    onSwipedRight: prevPage,
    onSwipedUp: () => console.log("Swiped up!"),
    onSwipedDown: () => console.log("Swiped down!"),
  });


  let pdfDocumentRef = useRef<PDFDocumentProxy>();

  const onDocumentLoadSuccess = useCallback(
    (loadedPdf: PDFDocumentProxy) => {
      setNumPages(loadedPdf.numPages);
      pdfDocumentRef.current = loadedPdf;
      console.log(loadedPdf);
    },
    [] // No dependencies
  );



  // function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
  //   setNumPages(numPages);
  // }
  const getSummary = (text: String): void=>{
    setLoading(true);
    axios.post(`${URLGPT}/getsummary`, null, { params: {text: text, COMPRESSIONRATIO: compressionratio, styletokens: "simple language and output" }})
      .then((res)=>res.data)
      .then((data)=>{
        setLoading(false);
        console.log(data);
        if(!("error" in data)){
          setSummary(data['summary']);
          if(targetRef.current){
            targetRef.current.scrollIntoView();
          }
        }
      })
      .catch((e)=>{
        setLoading(false);
        console.log(e)
      });
  }
  const getTextFromPage = async () => {
    const pdfDocument = pdfDocumentRef.current;
	let text: string = "";
    if (pdfDocument) {
      try {
		for(let extra=0; (extra<extraPages && pageNumber+extra <= numPages); extra++){
			const page = await pdfDocument.getPage(pageNumber+extra);
			const textContent = await page.getTextContent();
			const textItems = textContent.items;
			for(let i of textItems){
        if("str" in i)
          text += i.str + " " ;
      }
      text += " ";
		}
    console.log(text);
		getSummary(text);
      } catch (error) {
        console.error("Error extracting text from page:", error);
      }
    }
  };
  // useEffect(() => {
  //   if (pdfDocument) {
  //     // Example: Extract text from the first page
  //     getTextFromPage(1);
  //   }
  // }, [pdfDocument]);
  return (
    <div {...handlers} id="pdfbox">

      {settings && <div className="settings-panel" id="settingsPanel">
        <button className="close-button" id="closePanel" onClick={()=>setSettings(false)}>&times;</button>
        <h2>Settings</h2>
        <div className="setting">
          <label>
            Compression Ratio:
            <input type="text" defaultValue={String(compressionratio)} onBlur={(e)=>{setCompressionratio(Number(e.target.value))}} /> 
            {/* <input type="text" value={String(compressionratio)} onBlur={(e)=>{setCompressionratio(Number(e.target.value)); console.log(e.target.value)}} />  */}
          </label>
        </div>
        <div className="setting">
          <label>
            Number of Pages: 
            <input type="text" defaultValue={String(extraPages)} onBlur={(e)=>setExtraPages(Number(e.target.value))} />
            {/* <input type="text" value={String(extraPages)} onBlur={(e)=>setExtraPages(Number(e.target.value))} /> */}
          </label>
        </div>
      </div>}
      <Document className="mainView" file={pdfPath} onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} scale={scale}/>
        <p style={{margin: 0}}>
          Page 
		  {/* <input type="text" id="pageno_inp" defaultValue={1} onBlur={(e)=>setPageNumber(Number(e.target.value))} /> */}
		  <input type="text" id="pageno_inp" defaultValue={pageNumber} onBlur={(e)=>setPageNumber(Number(e.target.value))} />
		   of {numPages}
        </p>
        <div className="buttons">
          <button onClick={()=>setScale(Math.max(scale-1, 1))}>-</button>
          <button onClick={()=>setSettings(!settings)}>Settings</button>
          {/* <button onClick={prevPage}>Prev</button> */}
          <button onClick={getTextFromPage}>Summary</button>
          <button onClick={()=>setScale(Math.max(scale+1, 1))}>+</button>
          {/* <button onClick={nextPage}>Next</button> */}
          {/* <input type="text" value={String(extraPages)} onChange={(e)=>setExtraPages(Number(e.target.value))} />
          <input type="text" value={String(compressionratio)} onChange={(e)=>setCompressionratio(Number(e.target.value))} /> */}
        </div>
      </Document>
      <div ref={targetRef} className="summaryBox">
        {loading && <div className="loading-overlay">
					<div className="spinner"></div>
				</div>}
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>{summary}</ReactMarkdown>
      </div>
    </div>
  );
}

export default PdfBox;
