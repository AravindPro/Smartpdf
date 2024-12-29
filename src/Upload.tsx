import React, { useState } from 'react';
interface UploadProps{
	hasUploaded: React.Dispatch<React.SetStateAction<Boolean>>;
	setFilePath: React.Dispatch<React.SetStateAction<File|undefined>>;
	// pdfPath: File;
	paths:Array<Path>;
	setPaths: React.Dispatch<React.SetStateAction<Array<Path>>>;
};

interface Path {
  url: string;
  name: string;
};

const Upload: React.FC<UploadProps> = ({hasUploaded, setFilePath, paths, setPaths})=> {
	const [selectedFile, setSelectedFile] = useState<File|null>(null);
	// let [paths, setPaths] = useState<Array<Path>>([]);
	// Handle file selection
	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
	const file = event.target.files?.[0] || null;
		setSelectedFile(file);
	};

	// Handle file upload (you can modify this to upload to a server)
	const handleFileUpload = () => {
		if (!selectedFile) {
			alert('Please select a file first');
			return;
		}
	else{
		// Example: Log the file details
		console.log('Uploading file:', selectedFile);
		let path = URL.createObjectURL(selectedFile);
		setFilePath(selectedFile);
		paths = [...paths, {name: selectedFile.name, url: path}];
		console.log(paths);
		setPaths(paths);
		console.log(path);
		hasUploaded(true);
	}
		// You can implement file upload logic here, e.g., using Axios or Fetch API
	};

	return (
		<div>
			<h2>File Upload</h2>
			<input type="file" onChange={handleFileChange} />
			<button onClick={handleFileUpload}>Upload</button>
			{selectedFile && <p>Selected File: {selectedFile.name}</p>}

			{/* <div className="previousPaths">
				{paths.map((i: Path)=> <button className="path" onClick={()=>{
					setFilePath(i["url"]);
					hasUploaded(true);
				}}>{i["name"]}</button>)}
			</div> */}
		</div>
	);
	
}
export default Upload;
