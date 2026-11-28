import React from "react";
import "./domainclick.css";
import NothingHere from "./nothinghere";
import ProjectCard from "./ProjectCard";

export default function DomainClick({ suggestions ,handlebackClick, handleclick}) {
    const list = suggestions || [];
    return (
        <div className="sgtotal">
            <div className="sbackbutton">
                <p onClick={()=>handlebackClick()}><span>&#8592;</span>Go Back</p>
            </div>
            {list.map((suggestion) => (
                <div className="grid-item" key={suggestion._id}>
                     <div onClick={()=>{handleclick(suggestion._id)}}>

                    <ProjectCard projinfo={suggestion} />
                </div>
                </div>
            ))}
            {list.length===0 && <NothingHere/>}
        </div>
    );
}