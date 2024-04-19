import React from 'react';
import './TermsAndConditions.css';

const Instructions = () => {
    return (
        <div className="TCcontainer">
            <div className='tcin'>
                <div className="TCheader">
                    <h1>Instructions</h1>
                    <p>Welcome to our online integrated platform for project uploads</p>
                </div>



                <div className="TCterms">

                    <p>If you want to add your Organization to our database, please follow these instructions and send the required data to <b style={{color: "#195ca2"}}>freemovies5247@gmail.com</b>:</p>


                    <h3>Organization Name:</h3>

                    <p>Provide the full and official name of your Organization mentioned in the Governement Database.</p>

                    <h3>Address:</h3>

                    <p>Include the complete postal address of your Organization, including street address, city, state, and ZIP code.</p>

                    <h3>Organization ID:</h3>

                    <p>Share the unique identification or registration number assigned to your institute or company.</p>

                    <h3>Email:</h3>

                    <p>Provide an official email address associated of your Organization. This could be a general contact email or an official representative's email of your Organization.</p>

                    <h3>Website (Optional):</h3>

                    <p>If your Organization has an official website, you can include the URL. This is optional but this can speed up the authentication process</p>

                    <h3>Instructions:</h3>

                    <p>Include any specific instructions or additional information that you think is relevant for the database entry.</p>

                </div>
            </div>
        </div>
    );
};

export default Instructions;
