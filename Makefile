.PHONY: clean install build check testpypi deploy

clean:
	rm -rf dist build *.egg-info

install:
	python -m pip install --upgrade pip
	python -m pip install --upgrade build twine
	python -m pip install -e .

build: clean
	python -m build

check:
	python -m twine check dist/*

testpypi:
	python -m twine upload --repository testpypi dist/*

deploy: build check
	python -m twine upload dist/*
