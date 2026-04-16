function handler(event) {
    var request = event.request;
    var uri = request.uri;
    var lastSegment = uri.substring(uri.lastIndexOf("/") + 1);

    if (uri.endsWith("/")) {
        request.uri = uri + "index.html";
        return request;
    }

    if (lastSegment && !lastSegment.includes(".")) {
        request.uri = uri + "/index.html";
    }

    return request;
}
