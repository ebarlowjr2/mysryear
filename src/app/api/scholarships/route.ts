import { NextResponse } from "next/server";
export function GET(){
  const data = [
    { id: "1", name: "First-Gen Scholars Award", amount: "$2,500", deadline: "Nov 15", link: "https://example.com/s/1", tags: ["first-gen","national"], state: null },
    { id: "2", name: "STEM for All Grant", amount: "$5,000", deadline: "Dec 1",  link: "https://example.com/s/2", tags: ["STEM","GPA 3.0+"], state: "CA" },
    { id: "3", name: "Community Impact Scholarship", amount: "$1,000", deadline: "Oct 20", link: "https://example.com/s/3", tags: ["volunteering","local"], state: "TX" },
    { id: "4", name: "Merit-Based Excellence Award", amount: "$5,000", deadline: "March 15", link: "https://example.com/merit-award", tags: ["merit", "academic"], state: "NY" },
    { id: "5", name: "STEM Innovation Scholarship", amount: "$3,500", deadline: "April 1", link: "https://example.com/stem-scholarship", tags: ["STEM", "innovation"], state: "FL" },
    { id: "6", name: "Community Service Leadership Grant", amount: "$2,000", deadline: "Feb 28", link: "https://example.com/community-grant", tags: ["community", "leadership"], state: "WA" }
  ];
  return NextResponse.json(data);
}
