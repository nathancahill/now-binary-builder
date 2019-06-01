package main

import (
	"net/http"
	now "github.com/zeit/now-builders/utils/go/bridge"
)

func Handler(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "<h1>Hello from Go on Now!</h1>")
}

func main() {
	now.Start(http.HandlerFunc(Handler))
}
