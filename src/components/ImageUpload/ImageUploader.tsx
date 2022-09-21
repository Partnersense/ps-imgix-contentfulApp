import React, { ReactElement, useState } from 'react';

import {
  Button,
  Modal,
  Form,

} from '@contentful/forma-36-react-components';
import { AppInstallationParameters } from '../ConfigScreen/ConfigScreen'
import { SourceProps } from '../Dialog';
interface Props{
    selectedSourceID: string | undefined,
    params: AppInstallationParameters
}
export function ImageUpLoader( {selectedSourceID, params}: Props ): ReactElement {
    const [isShown, setShown] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File>();
    

    const changeHandler = (event : any ) => {
        setSelectedFile(event.target?.files[0]);
    }

    const logParams =() =>{
        console.log(selectedSourceID)
        console.log(params)
        console.log(selectedFile?.name)

    }
    const submitForm = () => {
    if (selectedFile === null) {
      return;
    }

    alert('Uploaded: ' + selectedFile);
    console.log(selectedFile)
    // Upload to S3
    
     
       var myHeaders = new Headers();
        myHeaders.append("Accept", "application/vnd.api+json");
        myHeaders.append("Authorization", `Bearer ${params.imgixAPIKey}`);
        myHeaders.append("Content-Type", "image/jpeg");

        // var file = "<file contents here>";

        var requestOptions: RequestInit = {
        method: 'POST',
        headers: myHeaders,
        body: selectedFile,
        redirect: 'follow',
        };

        fetch(`https://api.imgix.com/api/v1/sources/${selectedSourceID}/upload/${selectedFile?.name}`, requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
      
    setShown(false);
  };


  return (
    <>
        <br/>
        <br/>
        <br/>
        <Button onClick={()=> setShown(true)}>Or upload a new image</Button>
        <br/>
        <br/>
        <br/>
        <Modal onClose={()=> setShown(false)} isShown={isShown} position='top'>
            {
                ()=> (
                   <>
                        <Modal.Header title='Upload a new image'/>
                            <Modal.Content>
                                <Form onSubmit={submitForm}>
                                    <input type="file" onChange={changeHandler}/>
                                </Form>
                            </Modal.Content>
                            <Modal.Controls>
                                <Button
                                    size="small"
                                    onClick={() => setShown(false)}
                                >
                                    Close
                                </Button>
                                <Button
                                    size="small"
                                    disabled={selectedFile === null}
                                    onClick={submitForm}
                                >
                                    Upload
                                </Button>
                                <Button size="small" onClick={logParams}>LOG</Button>

                            </Modal.Controls>
                   </> 
                )
            }
        </Modal>
    </>
  );
}
