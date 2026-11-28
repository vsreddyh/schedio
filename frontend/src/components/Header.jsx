import React from "react";
import { useNavigate } from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();

    const handleLogoClick = () => {
        navigate('/');
    };

    const handleTitleClick = () => {
        navigate('/');
    };
    return (
        <div className="content120" id="header20">
            <div className="header-logo20">
                <div className="lll120">
                    <div className="logo20">
                        <img alt="" src={process.env.PUBLIC_URL + '/Plogo.png'} style={{ width: '35px', height: 'auto', paddingTop: '0px' }} onClick={handleLogoClick} />

                    </div>
                    <div className="title20" onClick={handleTitleClick} >
                        <p>Schedio</p>
                    </div>
                </div>
            </div>
        </div>

    )
}