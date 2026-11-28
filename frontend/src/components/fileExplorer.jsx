import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileOrFolder from './fileorfolder';
import './fileExplorer.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { solarizedlight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useParams } from 'react-router-dom';
import Loading from './Loading';

const FileExplorer = () => {
    const [sider, setsider] = useState(true);
    const { data } = useParams();
    const [fileName, setFileName] = useState('');
    const [folderStructure, setFolderStructure] = useState(null);
    const [fileContents, setFileContents] = useState({});
    const [cde, setcde] = useState();
    const [openforpath, setopenforpath] = useState('');
    const [codeExplain, setCodeExplain] = useState('');

    const fetchFolderStructure = async (data) => {
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}/en/fexp`,
                {
                    data,
                }
            );
            setFolderStructure(response.data.folderStructure);
            setFileContents(response.data.fileContents);
            setFileName(response.data.filename);
        } catch (error) {
            console.error('Error fetching folder structure:', error);
        }
    };
    useEffect(() => {
        fetchFolderStructure(data);
    }, [data]);
    const handleCodeExplain = () => {
        setCodeExplain('');
        setsider(false);
        const response = axios.post(
            `${process.env.REACT_APP_BACKEND_URL}/en/explainCode`,
            {
                data: cde,
            }
        );
        response
            .then(function (result) {
                let codeExplainString = result.data.ans;
                codeExplainString = codeExplainString.replace(/\n/g, '<br/>');
                setCodeExplain(codeExplainString);
            })
            .catch(function (error) {
                console.error('Error: ', error);
            });
    };
    return (
        <div className='febodyy'>
            {sider && (
                <div className='sider'>
                    {folderStructure ? (
                        <FileOrFolder
                            fileName={fileName}
                            name={fileName}
                            contents={folderStructure}
                            fileContents={fileContents}
                            setcde={setcde}
                            setopenforpath={setopenforpath}
                            openforpath={openforpath}
                        />
                    ) : (
                        <Loading />
                    )}
                </div>
            )}
            {sider ? (
                <div className='festage'>
                    <div className='file-content'>
                        <div>
                            <SyntaxHighlighter
                                language='javascript'
                                style={solarizedlight}
                                customStyle={{ backgroundColor: '#03070f' }}
                            >
                                {cde ? cde : 'No code'}
                            </SyntaxHighlighter>
                        </div>
                    </div>
                    {sider && cde && (
                        <button
                            className='askme'
                            onClick={() => handleCodeExplain()}
                        >
                            Explain me!
                        </button>
                    )}
                </div>
            ) : (
                <div className='festage1'>
                    <button className='fileback' onClick={() => setsider(true)}>
                        back
                    </button>
                    <div className='file-content1'>
                        <div>
                            <SyntaxHighlighter
                                language='javascript'
                                style={solarizedlight}
                                customStyle={{ backgroundColor: '#03070f' }}
                            >
                                {cde ? cde : 'No code'}
                            </SyntaxHighlighter>
                        </div>
                    </div>
                    {!sider && (
                        <div
                            className='explain-block'
                            dangerouslySetInnerHTML={{
                                __html: codeExplain
                                    ? codeExplain
                                    : 'Generating',
                            }}
                        ></div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
