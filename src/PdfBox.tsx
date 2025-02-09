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
import remarkMath from "remark-math";
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
  const [pageNumberDisp, setPageNumberDisp] = useState<number>(1);
  const [extraPages, setExtraPages] = useState<number>(5);
  const targetRef: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  let [compressionratio, setCompressionratio] = useState<Number>(2);
  let [summary, setSummary] = useState<string>("");
  let [loading, setLoading] = useState(false);
  // let [settings, setSettings] = useState<Boolean>(false);
  let [styletokens,setStyleTokens] = useState("simple language");
  let [scale, setScale] = useState<number>(1);
  let [isSel, setIsSel] = useState<boolean>(false);
  let [selText, setSelectedText] = useState<string>('');
  const divRef = useRef(null);

  const handleSelection = ()=>{
      const selection = document.getSelection()?.toString();
      // console.log("Here");
      if(selection && selection.length > 0){
        setIsSel(true);
        setSelectedText(selection);
        console.log(selection);
      }
      else
        setIsSel(false);
    }
  // useEffect(()=>{

  //   window.addEventListener('selectionchange', handleSelection);
  //   window.addEventListener('onmouseup', handleSelection);

  //   return () => {

  //     window.removeEventListener('selectionchange', handleSelection);
  //     window.removeEventListener('onmouseup', handleSelection);
  //   };
  // }, []);

  
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        nextPage();
      }
      else if(event.key === "ArrowLeft"){
        prevPage();
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
    if(pageNumber < numPages){
      setPageNumberDisp(pageNumber+1);	
      setPageNumber(pageNumber+1);	
    }
  };
  const prevPage = ()=>{
    if(pageNumber > 1){
      setPageNumberDisp(pageNumber-1);	
      setPageNumber(pageNumber-1);	
    }
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
    axios.post(`${URLGPT}/getsummary`, null, { params: {text: text, COMPRESSIONRATIO: compressionratio, styletokens: styletokens }})
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

  const summarizeFunc = async () => {
    let text: string = "";
    if(isSel){
      text = selText;
    }
    else{
      const pdfDocument = pdfDocumentRef.current;
      if (pdfDocument) {
        try{
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
        }
        catch (error){
          console.error("Error extracting text from page:", error);
        }
      }
    }
    console.log(text);
    getSummary(text);
  };
  // useEffect(() => {
  //   if (pdfDocument) {
  //     // Example: Extract text from the first page
  //     summarizeFunc(1);
  //   }
  // }, [pdfDocument]);
  return (
    <div {...handlers} id="pdfbox">
      
      <Document className="mainView" file={pdfPath} onLoadSuccess={onDocumentLoadSuccess} onMouseUp={handleSelection}>
        <div ref={divRef}>
          <Page pageNumber={pageNumber} scale={scale} />
        </div>
        <p style={{margin: 0}}>
          Page 
          <input type="text" id="pageno_inp" value={pageNumberDisp} onChange={(e)=>setPageNumberDisp(Number(e.target.value))} onBlur={()=>setPageNumber(pageNumberDisp)} />
          of {numPages}
        </p>
        <div className="buttons">
          <button onClick={()=>setScale(Math.max(scale-0.5, 1))}>-</button>
          {/* <button onClick={()=>setSettings(!settings)}>Settings</button> */}
          {/* <button onClick={prevPage}>Prev</button> */}
          <button onClick={summarizeFunc}>{isSel?'Summary Selection':'Summary'}</button>
          <button onClick={()=>setScale(Math.max(scale+0.5, 1))}>+</button>
          {/* <button onClick={nextPage}>Next</button> */}
          {/* <input type="text" value={String(extraPages)} onChange={(e)=>setExtraPages(Number(e.target.value))} />
          <input type="text" value={String(compressionratio)} onChange={(e)=>setCompressionratio(Number(e.target.value))} /> */}
        </div>

        <div className="sliders">
          <label className="itemslide">
            Compression Ratio: 
            <input type="range" min={1} max={10} step={0.1} value={String(compressionratio)} onChange={(e)=>{setCompressionratio(Number(e.target.value))}} /> 
            <span className='range_disp'>{String(compressionratio)}</span>
          </label>
          <label className="itemslide">
            Number of pages: 
            <input type="range" min={1} max={10} value={String(extraPages)} onChange={(e)=>{setExtraPages(Number(e.target.value))}} /> 
            <span className='range_disp'>{String(extraPages)}</span>
          </label>
          <label>
            Style-Tokens:
            <input type="text" value={styletokens} onChange={(e)=>setStyleTokens(e.target.value)}/>
          </label>

        </div>
      </Document>

      <div ref={targetRef} className="summaryBox">
        {loading && <div className="loading-overlay">
					<div className="spinner"></div>
				</div>}
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{summary}</ReactMarkdown>
      </div>
    </div>
  );
}

export default PdfBox;
