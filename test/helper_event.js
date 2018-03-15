// import assert from 'assert';
// import { event } from '../client/helpers/';

// describe("Helper::event", function() {
//     afterEach(function(){
//         event.fns = [];
//     });

//     it("can register", function() {
//         assert.equal(0, event.fns.length);
//         event.subscribe("event::test", function(){});
//         assert.equal(1, event.fns.length);
//     });

//     it("can unregister", function() {
//         assert.equal(0, event.fns.length);
//         event.subscribe("event::test", function(){});
//         assert.equal(1, event.fns.length);
//         event.unsubscribe("event::test");
//         assert.equal(0, event.fns.length);
//     });

//     it("can emit", function(done){
//         event.subscribe('event::test', function(){
//             done();
//         });
//         event.emit("event::test")
//     });

//     it("can emit multiple times", function(done){
//         let count = 0;
//         event.subscribe('event::test', function(){
//             count += 1;
//             if(count === 3){
//                 done();
//             }else{
//                 assert.equal(true, count < 3);
//             }
//         });
//         event.emit("event::test");
//         event.emit("event::test");
//         event.emit("event::test");
//     });
// });
