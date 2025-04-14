import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios, { getAdapter } from 'axios';
import { PDFDocumentProxy,PDFPageProxy } from 'pdfjs-dist';
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

import { MoonIcon, PaperAirplaneIcon,ArrowPathIcon, CheckIcon, MagnifyingGlassPlusIcon , MagnifyingGlassMinusIcon   } from '@heroicons/react/24/solid';

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
  let [loading, setLoading] = useState(false);
  let [showquestions, setShowquestions] = useState(false);
  let [showprompt, setShowprompt] = useState(false);
  // let [settings, setSettings] = useState<Boolean>(false);
  let [scale, setScale] = useState<number>(1);
  let [isSel, setIsSel] = useState<boolean>(false);
  let [selText, setSelectedText] = useState<string>('');
  let [question, setQuestion] = useState('');
  const divRef = useRef(null);

  let [questionList, setQuestionList] = useState<{ question: string; answer: string }[]>([]);
  let [promptlist, setPromptlist] = useState<{prompt: string, symbol: string}[]>([{prompt:"Summarize content and make it concise.", symbol:"SU"}, {prompt:"Explain in detail.", symbol:"EX"}]);

  let [newprompt, setNewprompt] = useState<string>('');
  let [newsymbol, setNewsymbol] = useState<string>('');
  let [extra, setExtra]=useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const handleSelection = ()=>{
    const selection = document.getSelection()?.toString();
    // console.log("Here");
    if(selection && selection.length > 0){
      setIsSel(true);
      setSelectedText(selection);
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
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
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
    onSwipedLeft: ()=>{if(!showprompt && !showquestions) nextPage()},
    onSwipedRight: ()=>{if(!showprompt && !showquestions) prevPage()},
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
  const handlePageLoadSuccess = (page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1 });
    const { width, height } = viewport;
    setPageSize({ width, height });
    console.log('PDF page dimensions:', width, height);
    setScale(Math.min(windowSize.height/pageSize.height, windowSize.width/pageSize.width)-0.15+extra);
  };


  // function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
  //   setNumPages(numPages);
  // }
  const getAnswer = (text: String, question: String): void=>{
    setLoading(true);
    questionList = [...questionList, {'question':String(question), 'answer':""}];
    setQuestionList(questionList);

    // console.log(`Rewrite and return in markdown language with latex for equations. ${question}:\n ${text}`);
    axios.post(`${URLGPT}/bookrewrite`, null, { params: {prompt: question, text:text }})
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
    console.log(question);
    let text: string = "";
    if(isSel){
      text = selText;
      getAnswer(text, question);
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
			{showquestions && <div id="popup_questions" className="fixed inset-0  bg-black bg-opacity-50 flex items-center justify-center z-50">
        {/* Popup box */}
				<div className="bg-zinc-600 rounded-2xl max-w-6xl shadow-xl p-6 w-[95%] h-[95%] text-center relative flex-col">
					<button onClick={()=>{setShowquestions(false)}} className="absolute top-0.5 right-1.5 w-4 h-4 text-gray-500 hover:text-gray-200 text-xl font-bold">
						&times;
					</button>
          <div className='flex flex-col max-h-[95%] mb-4'>
            <div className="flex-grow text-justify overflow-y-scroll p-4">
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
            <div className="absolute bottom-4 flex items-center space-x-2 w-[95%] mt-2 mx-2">
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
      {showprompt && 
      <div id="popup_prompt" className="fixed inset-0  bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-zinc-600 rounded-2xl max-w-6xl shadow-xl p-6 w-[95%] text-center relative inline-block">
          <button onClick={()=>{setShowprompt(false)}} className="absolute top-0.5 right-1.5 w-4 h-4 text-gray-500 hover:text-gray-200 text-xl font-bold">
            &times;
          </button>
          <input
            type="text"
            value={newprompt}
            onChange={(e)=>setNewprompt(e.target.value)}
            placeholder="Add new prompt"
            className="w-full bg-transparent border-none outline-none text-slate-400 placeholder-slate-400/70 px-2 py-1 font-mono overflow-x-scroll"
          />
          <input
            type="text"
            placeholder="SYMBOL"
            value={newsymbol}
            maxLength={2}
            onChange={(e)=>setNewsymbol(e.target.value.toUpperCase())}
            className="w-full bg-transparent border-none outline-none text-slate-400 placeholder-slate-400/70 px-2 py-1 font-mono overflow-x-scroll"
          />
          <button className="bottom-2 h-6  bg-zinc-700 text-gray-100 text-xs py-1 px-1 flex items-center gap-1 shadow-sm"
          onClick={()=>{
            if(newsymbol!=='' && newprompt!==''){
              promptlist = [...promptlist, {symbol:newsymbol, prompt:newprompt}];
              setPromptlist(promptlist);
              setNewprompt('');
              setNewsymbol('');
              setShowprompt(false);
            }
          }}
          >
            <CheckIcon className="h-4 text-gray-100" />
            Add
          </button>
        </div>
      </div>
      }

				<div {...handlers} className="max-w-4xl px-5 text-lg leading-relaxed text-justify">
          <Document className="mainView" file={pdfPath} onLoadSuccess={onDocumentLoadSuccess} onMouseUp={handleSelection}>
            <div ref={divRef} style={{filter: `invert(${invert})`}}>
              <Page pageNumber={pageNumber} scale={scale} onLoadSuccess={handlePageLoadSuccess} />
            </div>
          </Document>
          <div className="flex justify-center my-2">
            <div className="inline-flex items-center space-x-1 bg-gray-800 text-white text-base px-3 py-1 rounded-full border border-gray-600">
              <input
                type="number"
                id="pageno_inp"
                value={pageNumberDisp}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPageNumberDisp(Number(e.target.value))}
                onBlur={() => setPageNumber(pageNumberDisp)}
                className="min-w-10 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-center bg-transparent focus:outline-none"
              />
              <span className="text-gray-400">/ {numPages}</span>
            </div>
            <button className="mx-10 p-2 rounded-xl hover:bg-gray-300 text-gray-200 bg-gray-700 hover:text-white transition duration-200 shadow-md" onClick={(e)=>{setInvert(1-invert); (e.target as HTMLElement).scrollIntoView()}}>
              <MoonIcon className="w-5 h-5" />
            </button>
            <button onClick={(e)=>{extra=extra+0.1; setExtra(extra); scale=scale+extra; setScale(scale); (e.target as HTMLElement).scrollIntoView()}} className="mx-10 p-2 rounded-xl hover:bg-gray-300 text-gray-200 bg-gray-700 hover:text-white transition duration-200 shadow-md">
              <MagnifyingGlassPlusIcon className="w-5 h-5" />
            </button>
            <button onClick={(e)=>{extra=Math.max(extra-0.05, 0); setExtra(extra); setScale(scale+extra); (e.target as HTMLElement).scrollIntoView()}} className="mx-10 p-2 rounded-xl hover:bg-gray-300 text-gray-200 bg-gray-700 hover:text-white transition duration-200 shadow-md">
              <MagnifyingGlassMinusIcon className="w-5 h-5" />
            </button>
          </div>
				</div>

				<div className="fixed bg-transparent mt-10 right-0 top-0 items-center h-full w-20 bg-gray-100 shadow-lg flex flex-col pl-4">
          <button onClick={()=>setShowquestions(true)} className="items-center justify-center bg-gray-500 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded mb-4">
						Q
					</button>
          {promptlist.map((item, index)=>
					<button key={index} onClick={(e)=>{setShowquestions(true); getAnswerFunc(item['prompt'])}} className="items-center justify-center bg-zinc-700 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded mb-4">
						{item.symbol}
					</button>
          )}
					<button onClick={()=>setShowprompt(true)} className="items-center justify-center bg-gray-500 hover:bg-blue-500 text-zinc-200 font-semibold hover:text-white h-10 w-10 rounded mb-4">
						+
					</button>
				</div>
		</main>
  );
}

export default PdfBox;
