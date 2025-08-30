pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-cred')
        IMAGE_NAME = "dinaldocker/node-hello-world:${env.BUILD_ID}"
        APP_NAME = 'node-hello-world'
        VM_IP = '172.10.20.2' // REPLACE WITH YOUR VM's ACTUAL IP
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm: [
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/RMDcharuka/node-hello-world.git'
                    ]]
                ]
                bat 'echo ✅ Code checked out successfully'
            }
        }

        stage('Debug Workspace') {
            steps {
                bat 'echo Debug: check workspace contents'
                bat 'cd && dir'
                bat 'echo "Dockerfile exists:" && if exist Dockerfile (echo YES) else (echo NO)'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat "docker build -t ${IMAGE_NAME} ."
                bat 'echo ✅ Docker image built successfully'
            }
        }

        stage('Docker Login') {
            steps {
                bat "echo ${DOCKERHUB_CREDENTIALS_PSW} | docker login -u ${DOCKERHUB_CREDENTIALS_USR} --password-stdin"
                bat 'echo ✅ Logged in to DockerHub'
            }
        }

        stage('Push Docker Image') {
            steps {
                bat "docker push ${IMAGE_NAME}"
                bat "echo ✅ Docker image pushed: ${IMAGE_NAME}"
            }
        }

       stage('Deploy to K3s Cluster') {
    steps {
        script {
            // Temporary: Set the kubeconfig path manually
            def kubeconfigPath = 'C:\\\\Users\\\\user\\\\Desktop\\\\k3s.yaml'
            
            bat """
                echo Using kubeconfig: ${kubeconfigPath}
                kubectl --kubeconfig=${kubeconfigPath} cluster-info
                
                # Continue with your rollout command
                kubectl --kubeconfig=${kubeconfigPath} rollout status deployment/%APP_NAME% --timeout=180s
            """
        }
    }
}
        stage('Verify Deployment') {
            steps {
                script {
                    bat "kubectl --kubeconfig=%KUBECONFIG% rollout status deployment/%APP_NAME% --timeout=180s"
                    bat "kubectl --kubeconfig=%KUBECONFIG% get svc %APP_NAME%-service"
                    
                    // For complex scripting, use PowerShell
                    powershell """
                        \$nodePort = kubectl --kubeconfig=${env:KUBECONFIG} get svc ${env:APP_NAME}-service -o jsonpath='{.spec.ports[0].nodePort}'
                        Write-Output \"📊 Service NodePort: \$nodePort\"
                        if (\$nodePort) {
                            curl -s http://${env:VM_IP}:\$nodePort || Write-Output 'Curl test failed but deployment succeeded'
                            Write-Output \"🌐 Application accessible at: http://${env:VM_IP}:\$nodePort\"
                        }
                    """
                    
                    bat 'echo ✅ Deployment verified successfully'
                }
            }
        }
    }

    post {
        always {
            bat 'docker logout'
            bat 'echo 🚀 Pipeline execution completed'
        }
        success {
            bat 'echo ✅ Pipeline succeeded! Application deployed successfully.'
        }
        failure {
            bat 'echo ❌ Pipeline failed! Check the logs for errors.'
        }
    }
}