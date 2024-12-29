import {useState, useEffect} from 'react';
import ReactMarkdown from 'react-markdown';
import './Popup.css';
interface PopupProps {
	summary: string;
};

const Popup: React.FC<PopupProps> = ({summary}) =>{
	return (
		<div className="summaryBox">
			<ReactMarkdown>{summary}</ReactMarkdown>
		</div>
	);
};
export default Popup;