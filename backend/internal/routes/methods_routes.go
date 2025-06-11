package routes

import (
	"cetasense-v2.0/internal/handlers"
	"github.com/gorilla/mux"
)

func RegisterMethodsRoutes(r *mux.Router, methodsHandler *handlers.MethodsHandler) {
	// Endpoint to create a new method
	r.HandleFunc("/api/methods", methodsHandler.UploadMethods).Methods("POST")

	// Endpoint to get all methods
	r.HandleFunc("/api/methods", methodsHandler.ListMethods).Methods("GET")

	// Endpoint to get a method by ID
	r.HandleFunc("/api/methods/{id}", methodsHandler.GetMethodByID).Methods("GET")

	// Endpoint to delete a method by ID
	r.HandleFunc("/api/methods/{id}", methodsHandler.DeleteMethod).Methods("DELETE")
}
