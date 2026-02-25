#import "@preview/basic-resume:0.2.2": *

// Put your personal information here, replacing mine
#let name = "Seokju Jo"
#let email = "seokzoo_@kakao.com"
#let github = "github.com/seokzoo"
#let linkedin = "linkedin.com/in/seokzoo"
#let personal-site = "seokzoo.github.io"
#let location = "Seoul, South Korea"
#let phone = "+82 10-6818-1522"

#show: resume.with(
  author: name,
  // All the lines below are optional.
  // For example, if you want to to hide your phone number:
  // feel free to comment those lines out and they will not show.
  // location: location,
  email: email,
  github: github,
  linkedin: linkedin,
  // phone: phone,
  personal-site: personal-site,
  accent-color: "#26428b",
  font: "New Computer Modern",
  paper: "us-letter",
)

/*
* Lines that start with == are formatted into section headings
* You can use the specific formatting functions if needed
* The following formatting functions are listed below
* #edu(dates: "", degree: "", gpa: "", institution: "", location: "")
* #work(company: "", dates: "", location: "", title: "")
* #project(dates: "", name: "", role: "", url: "")
* certificates(name: "", issuer: "", url: "", date: "")
* #extracurriculars(activity: "", dates: "")
* There are also the following generic functions that don't apply any formatting
* #generic-two-by-two(top-left: "", top-right: "", bottom-left: "", bottom-right: "")
* #generic-one-by-two(left: "", right: "")
*/
== Education

#edu(
  institution: "Kyungpook National University",
  location: "Daegu, South Korea",
  dates: dates-helper(start-date: "Mar 2020", end-date: "Feb 2023"),
  degree: "B.S., Computer Science & Biomedical Covergence Science and Technology (double major)",
)
- Cumulative GPA: 3.82\/4.3 (94.2/100)
- Dropped out

#edu(
  institution: "Korea University",
  location: "Seoul, South Korea",
  dates: dates-helper(start-date: "Mar 2023", end-date: "Feb 2026"),
  degree: "B.S., Biosystems and Biomedical Science & Computer Science (double major)",
)
- Transferred in junior year
- Cumulative GPA: 4.27\/4.5 (97.7/100)
- Major GPA: 4.34/4.5

/*== Work Experience

#work(
  title: "Subatomic Shepherd and Caffeine Connoisseur",
  location: "Atomville, CA",
  company: "Microscopic Circus, Schrodinger's University",
  dates: dates-helper(start-date: "May 2024", end-date: "Present"),
)
- Played God with tiny molecules, making them dance to uncover the secrets of the universe
- Convinced high-performance computers to work overtime without unions, reducing simulation time by 50%
- Wowed a room full of nerds with pretty pictures of invisible things and imaginary findings */

== Projects

/*
#project(
  name: "Hyperschedule",
  // Role is optional
  // role: "Maintainer",
  // Dates is optional
  dates: dates-helper(start-date: "Nov 2023", end-date: "Present"),
  // URL is also optional
  url: "hyperschedule.io",
)
- Maintain open-source scheduler used by 7000+ users at the Claremont Consortium with TypeScript, React and MongoDB
  - Manage PR reviews, bug fixes, and coordinate with college for releasing scheduling data and over \$1500 of yearly funding
- Ensure 99.99% uptime during peak loads of 1M daily requests during course registration through redundant servers
*/
#project(
  name: "Deep Learning from Scratch",
  url: "github.com/seokzoo/deep-learning-from-scratch/",
)
- Implemented deep learning models including DQN, LLaMA, VAE, DDPM, and I-JEPA using PyTorch
  - recent self-supervised model and generative model architectures

#project(
  name: "nand2tetris",
  url: "github.com/seokzoo/nand2tetris",
)
- Built a simple computer from scratch using HDL as part of the nand2tetris course
  - Designed basic logic gates, ALU, memory units, and CPU

#project(
  name: "OS in 1000 lines",
  url: "github.com/seokzoo/OS-in-1000-lines",
)
- Building a minimal Operating System in 1k LOC of C
  - OS for RISC-V(32bit) running on OpenSBI 

== Extracurricular Activities

=== Hacking
#extracurriculars(
  activity: "Vulnerability Assessment Volunteer, Kyungpook National University IT Center",
  dates: dates-helper(start-date: "Jan 2022", end-date: "Feb 2022"),
)
- Participated in a security vulnerability assessment of the university's next-generation integrated information system as a volunteer
- Reported multiple vulnerabilities including Web Shell, XSS, and others

#extracurriculars(
  activity: "Vulnerability Assessment for KIBO",
  dates: dates-helper(start-date: "Dec 2020", end-date: "Dec 2020"),
)
- Participated in the "KIBO New Website Vulnerability Assessment" project led by IglooSecurity
- KIBO (Korea Technology Finance Corporation) is a quasi-governmental agency under South Korea’s Ministry of SMEs and Startups
- Reported multiple vulnerabilities (Detailed information is confidential due to NDA)

//#extracurriculars(
  //activity: "Best of the Best (BoB) - Vulnerability Analysis Track",
  //dates: dates-helper(start-date: "Jul 2016", end-date: "Feb 2017"),
//)
//- Participated in the “Best of the Best” (BoB) 5th program, a national cybersecurity talent cultivation initiative hosted by the Korea Information Technology Research Institute (KITRI)
//- Conducted a team project titled "Game Emulators Zero-day Vulnerability Analysis"
  //- Analyzed vulnerabilities in VirtuaNES, a PC emulator for Nintendo NES game consoles
  //- Contributed to the development of a malicious ROM exploiting the flaw in the Mapper

// #certificates(
//   name: "OSCP",
//   issuer: "Offensive Security",
//   // url: "",
//   date: "Oct 2024",
// )

== Skills
- *Programming Languages*: C/C++, Python, OCaml
- *Technologies*: PyTorch, Git
