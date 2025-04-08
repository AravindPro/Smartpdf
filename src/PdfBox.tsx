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
import { MoonIcon, PaperAirplaneIcon,ArrowPathIcon } from '@heroicons/react/24/solid';

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
  let [invert, setInvert] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageNumberDisp, setPageNumberDisp] = useState<number>(1);
  const [extraPages, setExtraPages] = useState<number>(5);
  const targetRef: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
  let [compressionratio, setCompressionratio] = useState<Number>(2);
  let [summary, setSummary] = useState<string>("");
  let [loading, setLoading] = useState(false);
  let [show, setShow] = useState(false);
  // let [settings, setSettings] = useState<Boolean>(false);
  let [styletokens,setStyleTokens] = useState("simple language");
  let [scale, setScale] = useState<number>(1);
  let [isSel, setIsSel] = useState<boolean>(false);
  let [selText, setSelectedText] = useState<string>('');
  let [question, setQuestion] = useState('');
  const divRef = useRef(null);

  let [questionList, setQuestionList] = useState<{ question: string; answer: string }[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

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

   useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    handleResize(); // Initial sizing
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const getAnswer = (text: String, question: String): void=>{
    setLoading(true);
    questionList = [...questionList, {'question':String(question), 'answer':""}];
    setQuestionList(questionList);

    axios.post(`${URLGPT}/query`, null, { params: {text: `${question}:\n${text}` }})
      .then((res)=>res.data)
      .then((data)=>{

        setLoading(false);
        console.log(data);
        if(!("error" in data)){
          questionList[questionList.length-1] = {'question':String(question), 'answer':String(data['text'])};
          setQuestionList(questionList);
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

  const getAnswerFunc = async (question: String) => {
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
          getAnswer(text, question);
        }
        catch (error){
          console.error("Error extracting text from page:", error);
        }
      }
    }
    console.log(text);
  };
  // useEffect(() => {
  //   if (pdfDocument) {
  //     // Example: Extract text from the first page
  //     getAnswerFunc(1);
  //   }
  // }, [pdfDocument]);

  return(
    <main ref={containerRef} className="relative overflow-hidden p-4 lg:p-16 xl:p-4 flex justify-center bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
			{show && <div id="popup" className="fixed inset-0  bg-black bg-opacity-50 flex items-center justify-center z-50">
        {/* Popup box */}
				<div className="bg-zinc-600 rounded-2xl max-w-6xl shadow-xl p-6 w-[95%] h-[95%] text-center relative">
					<button onClick={()=>{setShow(false)}} className="absolute top-0.5 right-1.5 w-4 h-4 text-gray-500 hover:text-red-500 text-xl font-bold">
						&times;
					</button>
          <div className='flex flex-col h-[90vh]'>
            <div className="flex-grow text-justify overflow-y-scroll p-4 h-full">
              {questionList.map((e)=>
                  <>
                    <p className="border-t border-b border-white p-4 text-2xl">{e['question']} </p>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{e.answer}</ReactMarkdown>
                  </>
              )
              }
              {loading && <div className="flex items-center justify-center h-32">
                <div className="w-10 h-10 border-4 border-dashed rounded-full animate-spin border-white"></div>
              </div>}
            </div>
            <div className="flex items-center space-x-2 w-full mt-2 mx-2">
              <button  onClick={()=>{questionList=[]; setQuestionList(questionList)}} className="p-2 bg-zinc-700 rounded-lg">
                <ArrowPathIcon className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={question}
                onChange={(e)=>setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent newline if textarea
                    getAnswerFunc(question);
                    setQuestion('');
                  }
                }}
                className="flex-grow px-4 py-2 border border-neutral-800 rounded-lg focus:outline-none bg-zinc-700"
              />
              <button onClick={()=>{getAnswerFunc(question); setQuestion('')}} className="p-2 bg-zinc-700 rounded-lg">
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
				</div>
			</div>}
				<div {...handlers} className="max-w-4xl px-5 text-lg leading-relaxed text-justify">
          <Document className="mainView" file={pdfPath} onLoadSuccess={onDocumentLoadSuccess} onMouseUp={handleSelection}>
            <div ref={divRef} style={{filter: `invert(${invert})`}}>
              <Page pageNumber={pageNumber} width={containerWidth - 126} />
            </div>
          </Document>
          <div className="flex justify-center my-2">
            <div className="inline-flex items-center space-x-1 bg-gray-800 text-white text-xl px-3 py-1 rounded-full border border-gray-600">
              <input
                type="number"
                id="pageno_inp"
                value={pageNumberDisp}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPageNumberDisp(Number(e.target.value))}
                onBlur={() => setPageNumber(pageNumberDisp)}
                className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-14 text-center bg-transparent focus:outline-none"
              />
              <span className="text-gray-400">/ {numPages}</span>
            </div>
            <button className="mx-10 p-2 rounded-xl bg-gray-300 text-gray-200 hover:bg-gray-700 hover:text-white transition duration-200 shadow-md" onClick={()=>setInvert(1-invert)}>
              <MoonIcon className="w-5 h-5" />
            </button>
          </div>

				</div>
				<div className="fixed bg-transparent mt-10 right-0 top-0 items-center h-full w-20 bg-gray-100 shadow-lg flex flex-col pl-4">
					<button onClick={()=>{setShow(true)}} className="items-center justify-center bg-zinc-700 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded mb-4">
						Q
					</button>
					<button onClick={()=>{setShow(true); getAnswerFunc('Explain'); }} className="items-center justify-center bg-zinc-700 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded mb-4">
						EX
					</button>
					<button onClick={()=>{}} className="items-center justify-center bg-gray-500 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded mb-4">
						+
					</button>
				</div>
		</main>
  );
  // return (
  //   <div id="pdfbox" className="relative overflow-hidden p-4 lg:p-16 xl:p-4 flex justify-center">
  //     <main>
  //       <div {...handlers} >
  //         <Document className="mainView" file={pdfPath} onLoadSuccess={onDocumentLoadSuccess} onMouseUp={handleSelection}>
  //           <div ref={divRef} style={{filter: `invert(${invert})`}}>
  //             <Page pageNumber={pageNumber} scale={scale} />
  //           </div>
  //           <p style={{margin: 0}}>
  //             Page 
  //             <input type="text" id="pageno_inp" value={pageNumberDisp} onChange={(e)=>setPageNumberDisp(Number(e.target.value))} onBlur={()=>setPageNumber(pageNumberDisp)} />
  //             of {numPages}
  //           </p>
  //         </Document>
  //       </div>

  //       <div className="sliders">
  //         <label className="itemslide">
  //           Compression Ratio: 
  //           <input type="range" min={1} max={10} step={0.1} value={String(compressionratio)} onChange={(e)=>{setCompressionratio(Number(e.target.value))}} /> 
  //           <span className='range_disp'>{String(compressionratio)}</span>
  //         </label>
  //         <label className="itemslide">
  //           Number of pages: 
  //           <input type="range" min={1} max={10} value={String(extraPages)} onChange={(e)=>{setExtraPages(Number(e.target.value))}} /> 
  //           <span className='range_disp'>{String(extraPages)}</span>
  //         </label>
  //         <label>
  //           Style-Tokens:
  //           <input type="text" value={styletokens} onChange={(e)=>setStyleTokens(e.target.value)}/>
  //         </label>
  //       </div>

  //       <div ref={targetRef} className="summaryBox">
  //         {loading && <div className="loading-overlay">
  //           <div className="spinner"></div>
  //         </div>}
  //         <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{summary}</ReactMarkdown>
  //       </div>
  //     </main>
      
  //     <div className="absolute bg-transparent mt-4 right-0 top-0 items-center h-full w-20 bg-gray-100 shadow-lg flex flex-col pl-4">
  //       <button className="items-center justify-center bg-zinc-700 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded" onClick={()=>setScale(Math.max(scale-0.5, 1))}>-</button>
  //       {/* <button onClick={()=>setSettings(!settings)}>Settings</button> */}
  //       {/* <button onClick={prevPage}>Prev</button> */}
  //       <button className="items-center justify-center bg-zinc-700 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded" onClick={summarizeFunc}>{isSel?'Summary Selection':'Summary'}</button>
  //       <button className="items-center justify-center bg-zinc-700 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded" onClick={()=>setScale(Math.max(scale+0.5, 1))}>+</button>
  //       <button className="items-center justify-center bg-zinc-700 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded" onClick={()=>setInvert(invert?0:1)}>Invert</button>
  //       {/* <button onClick={nextPage}>Next</button> */}
  //       {/* <input type="text" value={String(extraPages)} onChange={(e)=>setExtraPages(Number(e.target.value))} />
  //       <input type="text" value={String(compressionratio)} onChange={(e)=>setCompressionratio(Number(e.target.value))} /> */}
  //     </div>      
  //   </div>
  // );
}

export default PdfBox;
