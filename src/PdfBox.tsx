import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import axios from 'axios';
import { pdfjs } from 'react-pdf';
import { PDFDocumentProxy } from 'pdfjs-dist';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PdfBox.css';
import ReactMarkdown from 'react-markdown';

// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.mjs',
//   import.meta.url,
// ).toString();

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

let URLGPT = "https://smartbooks-sfgp.onrender.com";
interface PdfBoxProps {
  // pdfPath: string;
  pdfPath: File|undefined;
}

const PdfBox: React.FC<PdfBoxProps> = ({ pdfPath}) => {
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [extraPages, setExtraPages] = useState<number>(10);
  let [compressionratio, setCompressionratio] = useState<Number>(2);
  let [summary, setSummary] = useState<string>("");
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
	axios.post(`${URLGPT}/getsummary`, null, { params: {text: text, COMPRESSIONRATIO: compressionratio, styletokens: "simple language and output" }})
		.then((res)=>res.data)
		.then((data)=>{
			console.log(data);
			if(!("error" in data)){
				setSummary(data['summary']);
			}
		})
		.catch((e)=>console.log(e));
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
				text += i.str ;
			}
		}
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
    <div>
      <Document className="mainView" file={pdfPath} onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} />
        <p style={{margin: 0}}>
          Page 
		  <input type="text" id="pageno_inp" value={pageNumber} onChange={(e)=>setPageNumber(Number(e.target.value))} />
		   of {numPages}
        </p>
        <div className="buttons">
          <button onClick={(e)=>{
              if(pageNumber>1)
                setPageNumber(pageNumber-1);
            }
          }>Prev</button>
          <button onClick={getTextFromPage}>Summary</button>
          <button onClick={(e)=>{
            if(pageNumber < numPages)
              setPageNumber(pageNumber+1);			
            }}>Next</button>
          <input type="text" value={String(compressionratio)} onChange={(e)=>setCompressionratio(Number(e.target.value))} />
        </div>
      </Document>
      <div className="summaryBox">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </div>
  );
}

export default PdfBox;