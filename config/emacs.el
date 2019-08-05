;; this is the config that's loaded by emacs when using the org mode export

;; org mode stuff
(setq org-export-use-babel nil)
(setq user-full-name "Filestash")
(setq org-todo-keywords (quote ((sequence "TODO(t)" "DOING(d)" "WAITING(w)" "|" "CANCEL(C)" "DEFERRED(F)" "DONE(D)"))))

;; html export
(setq org-html-head "<meta http-equiv='X-UA-Compatible' content='IE=edge'><meta content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' name='viewport'><style>html{touch-action:manipulation;-webkit-text-size-adjust:100%}body{padding:0;margin:0;background:#f2f6fa;color:#3c495a;font-weight:normal;font-size:17px;font-family:'avenir next','avenir','Roboto','Arial',sans-serif}img{max-width: 100%;object-fit: cover;}h2,h3,h4,h5,h6{font-family:'Trebuchet MS',Verdana,sans-serif;color:#586b82;padding:5px 0 0 0;margin:20px 0 10px 0;font-size:1.2em}h2{margin:30px 0 20px 0;font-size:1.5em}h2:after{display:block;content:' ';width:60px;border-bottom:3px solid #586b82;margin-top:5px;}li{text-align:left;}a{color:#3fa7ba;text-decoration:none}p{margin:10px 0;text-align:justify}ul,ol{margin:0;text-align:justify}#content ul,#content ol{margin-top:-5px;}#content ul>li>ul, #content ol>li>ol{margin-top:0;} ul>li>code{color:#586b82}pre{white-space:pre-wrap}pre.src{padding:10px}#content{width:96%;max-width:950px;margin:2% auto 5% auto;background:white;border-radius:2px;border-right:1px solid #e2e9f0;border-bottom:2px solid #e2e9f0;padding:40px 115px 150px 115px;border-top:15px solid #343C44;box-sizing:border-box}.org-src-container{margin-top:50px}#postamble{opacity:0.5;padding-bottom:15px;}#postamble .author{display:none} .center{text-align:center!important;} #postamble p{text-align:center;}h1.title{background-color:#343C44;color:#fff;margin:-55px -115px 60px -115px;padding:60px 0;font-weight:normal;font-size:2em;border-top-left-radius:2px;border-top-right-radius:2px}@media (max-width: 1050px){#content{padding:0 70px 100px 70px}h1.title{margin:-15px -70px 50px -70px}}@media (max-width: 800px){#content{width:100%;margin-top:0;padding:0 4% 60px 4%}h1.title{margin:-15px -5% 50px -5%;padding:40px 5%}}pre,.verse{box-shadow:none;background-color:#f9fbfd;border:1px solid #e2e9f0;color:#586b82;padding:10px;font-family:monospace;overflow:auto;margin:6px 0}#table-of-contents{margin-bottom:30px;padding-top:0px}#table-of-contents h2{margin-bottom:15px}#text-table-of-contents ul{padding-left:15px}#text-table-of-contents>ul{padding-left:0}#text-table-of-contents li{list-style-type:none}#text-table-of-contents a{color:#7c8ca1;font-size:0.95em;text-decoration:none}table{border-color:#586b82;font-size:0.95em}table thead{color:#586b82}table tbody tr:nth-child(even){background:#f9f9f9}table tbody tr:hover{background:#586b82!important;color:white}table .left{text-align:left}table .right{text-align:right}.todo{font-family:inherit;color:#f26d6d;opacity:0.8}.done{color:inherit}.tag{background:initial}.tag>span{background-color:#eee;font-family:monospace;padding-left:7px;padding-right:7px;border-radius:2px;float:right;margin-left:5px;font-size:14px;padding-bottom:2px;}#text-table-of-contents .tag>span{float:none;margin-left:0}.timestamp{color:#7c8ca1}@media print{@page{margin-bottom:3cm;margin-top:3cm;margin-left:2cm;margin-right:2cm;font-size:10px}#content{border:none}}</style>")
(setq org-html-validation-link nil)
(setq org-html-creator-string "Using <a href=\"http://filestash.app\">Filestash</a>")

;; latex export
;; (setq org-latex-listings 'verbatim)
(setq org-latex-default-packages-alist
      '(("AUTO" "inputenc"  t)
        ("T1"   "fontenc"   t)
        (""     "fixltx2e"  nil)
        (""     "graphicx"  t)
        (""     "longtable" nil)
        (""     "float"     nil)
        (""     "wrapfig"   nil)
        (""     "rotating"  nil)
        ("normalem" "ulem"  t)
        (""     "amsmath"   t)
        (""     "textcomp"  t)
        (""     "marvosym"  t)
        (""     "wasysym"   t)
        (""     "amssymb"   t)
        (""     "xcolor"    t)
        (""     "listings"  t)
        ("colorlinks=true, allcolors=red!20!green!50!blue!80!black, pdfborder={0 0 0}" "hyperref"  nil)
        "\\tolerance=1000"
        "\\lstset{columns=flexible, breaklines=true}"
        "\\definecolor{doctitle}{RGB}{51,51,51}"
        "\\usepackage{lmodern}"
        "\\usepackage{xcolor}"
        "\\renewcommand{\\familydefault}{\\sfdefault}"
        "\\usepackage{sectsty}"
        "\\sectionfont{\\color{doctitle}}"
        "\\subsectionfont{\\color{doctitle}}"
        "\\subsubsectionfont{\\color{doctitle}}"
        "\\usepackage{parskip}"
        ))

;; markdown export
(add-to-list 'load-path (file-name-directory load-file-name))
(require 'ox-gfm)
(defalias 'org-md-export-to-markdown 'org-gfm-export-to-markdown)
