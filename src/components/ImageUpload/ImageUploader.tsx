import React, { ReactElement, useState } from 'react';

import {
  Button,
  Modal,
  Form,

} from '@contentful/forma-36-react-components';


import { SourceProps } from '../Dialog';

export function ImageUpLoader({}): ReactElement {
    const [isShown, setShown] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
  
    const changeHandler = (event : any ) => {
        setSelectedFile(event.target?.files[0]);
    }

    const submitForm = () => {
    if (selectedFile === null) {
      return;
    }

    alert('Uploaded: ' + selectedFile);
    // Upload to S3
    setShown(false);
  };


  return (
    <>
        <Button onClick={()=> setShown(true)}>Or upload a new image</Button>
        <Modal onClose={()=> setShown(false)} isShown={isShown}>
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
                            </Modal.Controls>
                   </> 
                )
            }
        </Modal>
    </>
  );
}
