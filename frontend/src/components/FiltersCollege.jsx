import React, { useState, useEffect } from "react";
import "./collegemain.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { faArrowDown } from '@fortawesome/free-solid-svg-icons';


export default function FiltersCollege({ sendDataToParent }) {
    const [formData, setFormData] = useState({
        sort_by: 'Upload Date',
        order: false
    });
    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };



    useEffect(() => {
        sendDataToParent(formData);
    }, [formData, sendDataToParent]);

    const handleToggle = () => {
        setFormData({
            ...formData,
            order: !formData.order
        });
    };

    return (
        <div className="filtersCollege">
            
            <div className="filter3College">
                <select name="sort_by" id="year" value={formData.sort_by} onChange={handleChange}>
                    <option value="Name">Name</option>
                    <option value="Likes">Likes</option>
                    <option value="Upload Date">Upload Date</option>
                </select>
            </div>
            <div className="filter4College">
                <button name="order" onClick={handleToggle}>
                    {formData.order ? <> Ascending  <FontAwesomeIcon icon={faArrowUp} /></> : <> Descending  <FontAwesomeIcon icon={faArrowDown} /></>}
                </button>
            </div>
        </div>
    );
}