;; this is the config that's loaded by emacs when using the org mode export

;; org mode stuff
(setq org-export-use-babel nil)
(setq user-full-name "Filestash")
(setq org-todo-keywords (quote ((sequence "TODO(t)" "DOING(d)" "WAITING(w)" "|" "CANCEL(C)" "DEFERRED(F)" "DONE(D)"))))

;; html export
(setq org-html-head "<meta http-equiv='X-UA-Compatible' content='IE=edge'><meta content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' name='viewport'><style>html{touch-action:manipulation;-webkit-text-size-adjust:100%}body{margin:5% auto;padding:0 25px;background:#fafeff;max-width:950px;color:#3c495a;font-weight:400;font-size:18px;line-height:25px;font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif}h1,h2,h3,h4,h5,h6{font-family:Ubuntu,'Trebuchet MS',Verdana,sans-serif;color:#586b82;padding:0;margin:15px 0 10px 0;font-size:1.05em}h2{margin:50px 0 15px 0;font-size:1.3em}h3{font-size:1.15em}h1.title{color:#343c44;padding:50px 0 50px 0;font-weight:400;font-size:2.2em;text-shadow:1px 1px 1px rgba(0,0,0,.1)}h1.title:after{content:' ';border-bottom:4px solid;width:150px;height:4px;display:block;margin:10px auto 20px auto;border-radius:2px;box-shadow:1px 1px 1px rgba(0,0,0,.1)}a{color:#3fa7ba;text-decoration:none}p{margin:15px 0 0 0;text-align:justify}img{max-width:100%;display:block;border-radius:3px}ol,ul{margin:0 0 5px 0;text-align:justify;overflow:auto}@media only screen and (max-width:600px){ul.org-ul{padding-left:20px}}ul>li>code{color:#586b82}pre{white-space:pre-wrap}pre.src:hover:before{display:inline;background:#fff;border-radius:5px;padding:0 10px;font-size:15px;border:1px solid #e2e9f0}.verse,pre,pre.src{box-shadow:none;background-color:#fff;border:1px solid #e2e9f0;color:#586b82;padding:15px;font-family:Monaco,monospace;overflow:auto;margin:6px 0;border-radius:2px}#table-of-contents{font-family:Ubuntu,'Trebuchet MS',Verdana,sans-serif;margin-bottom:50px;margin-top:50px}#text-table-of-contents ul{padding-left:30px;margin:0}#text-table-of-contents>ul{padding-left:0}#text-table-of-contents li{list-style-type:none}#text-table-of-contents a{color:#7c8ca1;text-decoration:none}table{border-color:#586b82;font-size:.95em}table thead{color:#586b82}table tbody tr:nth-child(even){background:#f9f9f9}table tbody tr:hover{background:#586b82!important;color:#fff}table .left{text-align:left}table .right{text-align:right}.todo{font-family:inherit;color:inherit;opacity:.9}.done{color:inherit;opacity:.9}.tag{background:initial}.tag>span{background-color:#eee;font-family:monospace;padding-left:7px;padding-right:7px;border-radius:2px;float:right;margin-left:5px}#text-table-of-contents .tag>span{float:none;margin-left:0}.timestamp{color:#7c8ca1}#postamble{margin-top:100px;text-align:right;opacity:.5}#postamble p{text-align:inherit}@media print{@page{margin-bottom:3cm;margin-top:3cm;margin-left:2cm;margin-right:2cm}h1.title{padding-top:0}body{margin-top:0}}</style>")
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
