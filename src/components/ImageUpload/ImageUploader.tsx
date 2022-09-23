import React, { ChangeEvent, ReactElement, useState } from 'react';

import {
  Button,
  Modal,
  Form,
  TextField,
  Notification
} from '@contentful/forma-36-react-components';
import { AppInstallationParameters } from '../ConfigScreen/ConfigScreen'
interface Props{
    selectedSourceID: string | undefined,
    params: AppInstallationParameters
}
export function ImageUpLoader( {selectedSourceID, params}: Props ): ReactElement {
    const [isShown, setShown] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File>();
    const [imageFolderName, setImageFolderName] = useState("");
    

    const changeHandler = (event : any ) => {
        setSelectedFile(event.target?.files[0]);
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setImageFolderName(e.target.value)
    }

    const logParams =() =>{
        console.log(selectedSourceID)
        console.log(params)
        console.log(selectedFile?.name)
    }
    const submitForm = () => {
    if (selectedFile === undefined) {
      return;
    }
       Notification.setPosition('top'); 
       var myHeaders = new Headers();
        myHeaders.append("Accept", "application/vnd.api+json");
        myHeaders.append("Authorization", `Bearer ${params.imgixAPIKey}`);
        myHeaders.append("Content-Type", "image/jpeg");

        var requestOptions: RequestInit = {
        method: 'POST',
        headers: myHeaders,
        body: selectedFile,
        redirect: 'follow',
        };
                            
        fetch(`https://api.imgix.com/api/v1/sources/${selectedSourceID}/upload/${imageFolderName !== undefined || imageFolderName !== "" ? imageFolderName + "/" : ""}${selectedFile?.name}`, requestOptions)
        .then(response => response.text())
        .then(result => result.includes("errors") ?  Notification.error(result) : Notification.success("Successful upload !"))
        .catch(error => Notification.error(error))
        .finally(()=> setShown(false));
      
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
                                {
                                selectedFile != null && 
                                <TextField
                                value={imageFolderName || ''}
                                onChange={handleChange}
                                name="IMGIX file path" id={'imgixFilePath'}
                                labelText={'Specify a destination path'}
                                />}
                            </Modal.Content>
                            <Modal.Controls>
                                <Button
                                    size="small"
                                    onClick={() => setShown(false)}
                                >
                                    Close
                                </Button>
                                {selectedFile !== undefined && 
                                 <Button
                                 size="small"
                                 disabled={selectedFile === undefined}
                                 onClick={submitForm}
                             >
                                 Upload
                             </Button>
                                }
                               
                                <Button size="small" onClick={logParams}>LOG</Button>

                            </Modal.Controls>
                   </> 
                )
            }
        </Modal>
    </>
  );
}
