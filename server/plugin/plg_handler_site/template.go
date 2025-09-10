package plg_handler_site

import "html/template"

var TmplAutoindex = template.Must(template.New("autoindex").Parse(`
<html>
    <head>
        <title>Index of {{ .Base }}</title>
    </head>
    <body>
        <h1>Index of {{ .Base }}</h1><pre><a href="../">../</a><br>
        {{- range .Files -}}
           <a href="{{if .IsDir}}{{printf "./%s/" .Name}}{{else}}{{printf "./%s" .Name}}{{end}}">
               {{- if .IsDir -}}
                   {{ printf "%-40.40s" (printf "%s/" .Name) }}
               {{- else -}}
                   {{ printf "%-40.40s" .Name }}
               {{- end -}}
           </a>  {{ (.ModTime).Format "2006-01-02 15:04:05" }}  {{ printf "%8d" .Size }}<br>
        {{- end }}
        <hr>
        </pre>
    </body>
</html>`))
