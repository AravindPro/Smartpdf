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
		// <div>
		// 	<h2>File Upload</h2>
		// 	<input type="file" accept="application/pdf" onChange={handleFileChange} />
		// 	<button onClick={handleFileUpload}>Upload</button>
		// 	{selectedFile && <p>Selected File: {selectedFile.name}</p>}

		// 	{/* <div className="previousPaths">
		// 		{paths.map((i: Path)=> <button className="path" onClick={()=>{
		// 			setFilePath(i["url"]);
		// 			hasUploaded(true);
		// 		}}>{i["name"]}</button>)}
		// 	</div> */}
		// </div>
		<div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg space-y-4">
			<h2 className="text-2xl font-semibold text-gray-800">Upload a PDF</h2>

			<label className="block">
				<span className="text-gray-700">Select file</span>
				<input 
				type="file" 
				accept="application/pdf" 
				onChange={handleFileChange}
				className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
							file:rounded-full file:border-0
							file:text-sm file:font-semibold
							file:bg-blue-50 file:text-blue-700
							hover:file:bg-blue-100
							cursor-pointer"
				/>
			</label>

			<button 
				onClick={handleFileUpload}
				className="w-full bg-blue-600 text-white py-2 px-4 rounded-xl hover:bg-blue-700 transition-colors"
			>
				Upload
			</button>

			{selectedFile && (
				<p className="text-sm text-gray-600">
				<span className="font-medium">Selected File:</span> {selectedFile.name}
				</p>
			)}
		</div>

	);
	
}
export default Upload;
