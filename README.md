# CodeSwarm Docker Worker

* Standalone process. (may very easily be split into multiple process in the future if needed / 1-1 process connection)

* Must connect to the [CodeSwarm Balancer](https://github.com/codeswarm/codeswarm-balancer)

* Runs jobs within Docker containers

### ENV Variables

* DISPATCHER_IP - balancer ip, defaults to "127.0.0.1".
* DISPATCHER_PORT - balancer port, defaults to 8632.

## License Information

This project has been released under the [Apache License, version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html), the text of which is included below. This license applies ONLY to the source of this repository and does not extend to any other CodeSwarm distribution or variant, or any other 3rd party libraries used in a repository. 

> Copyright © 2014 CodeSwarm, Inc.

> Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

> [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

>  Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
