# CS493_Cloud_Portfolio
This project uses GCP and deploys an app on GCP that uses Datastore to access data through CRUD operations. 
In addition, it uses Auth0 to authenticate and authorize users that has access to the data through examining the JWT token given by the Auth0.

The app can be accessed through this url: https://portfolio-wonglo.uc.r.appspot.com

The API specificiation from wonglo_project.pdf describes in detail how the API works and the relationships between each of the entities in the data.
As part of the project, a test suite using postman is created to test the API to confirm the relationships stated between entities are established correctly, access are provided correctly and if error codes are displayed correctly during different CRUD operations.

Here are some of the requirements established for this project:
1. For each entity a collection URL must be provided that is represented  by the collection name.
2. If an entity is related to a user, then the collection URL must show only those entities in the collection which are related to the user corresponding to the valid JWT provided in the request
3. For an entity that is not related to users, the collection URL should show all the entities in the collection.
4. The collection URL for an entity must implement pagination showing 5 entities at a time
5. Every representation of an entity must have a 'self' link pointing to the canonical representation of that entity
6. Each entity must have at least 3 properties of its own.
7. Every entity must support all 4 CRUD operations, i.e., create/add, read/get, update/edit and delete.
8. Every CRUD operation for an entity related to a user must be protected and require a valid JWT corresponding to the relevant user.
9. You must provide an endpoint to create a relationship and another to remove a relationship between the two non-user entities. It is your design choice to make these endpoints protected or unprotected.
10. If an entity has a relationship with other entities, then this info must be displayed in the representation of the entity
11. There is no requirement to provide dedicated endpoints to view just the relationship
12. For endpoints that require a request body, you only need to support JSON representations in the request body.
13. Any response bodies should be in JSON, including responses that contain an error message.
14. Any request to an endpoint that will send back a response with a body must allow 'application/json' in the Accept header. If a request doesn't have such a header, it should be rejected.
