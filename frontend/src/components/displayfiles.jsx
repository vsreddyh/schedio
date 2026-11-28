import { useEffect } from 'react';

const DisplayFile = ({fileContents,fullPath,setcde}) => {
    useEffect(() => {
        setcde(fileContents[fullPath]);
    }, [fileContents, fullPath, setcde]);
    return (
      null
    );
  };

  export default DisplayFile;